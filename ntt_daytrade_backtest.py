#!/usr/bin/env python3
"""Intraday (day-trade) backtest for NTT (9432.T) using an opening-range breakout.

Data source priority:
  1. --csv FILE            : a local OHLCV CSV (offline, reproducible)
  2. yfinance download     : live intraday bars from Yahoo Finance
  3. synthetic fallback    : deterministic simulated bars, clearly labelled,
                             so the pipeline is runnable where Yahoo is blocked

Strategy (one trade per session by default, always flat at the close):
  * Build an opening range (OR) from the first `--or-minutes` of the session.
  * Go long on a break above OR high, short on a break below OR low, with a
    breakout buffer to filter noise.
  * Stop and target are multiples of the OR height; any position still open at
    the session's last bar is closed at that bar's close.

Fill conventions (documented so the results are interpretable):
  * Entry is filled at the breakout level, or at the bar open if the bar gapped
    through it; slippage always works against the trade.
  * When a bar's range covers both the stop and the target, the stop is assumed
    to fill first (pessimistic).
"""

from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, time, timedelta

import numpy as np
import pandas as pd

TICKER = "9432.T"  # Nippon Telegraph and Telephone, Tokyo Stock Exchange
TZ = "Asia/Tokyo"
OHLCV = ["Open", "High", "Low", "Close", "Volume"]


# --------------------------------------------------------------------------- #
# Data loading
# --------------------------------------------------------------------------- #
class DataUnavailable(RuntimeError):
    """Raised when no real market data could be obtained."""


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten yfinance columns, keep OHLCV, and put the index in Tokyo time."""
    if isinstance(df.columns, pd.MultiIndex):
        # yfinance returns (field, ticker); drop the ticker level.
        levels = [lvl for lvl in range(df.columns.nlevels) if lvl != 0]
        df = df.droplevel(levels, axis=1)
    df = df.rename(columns={c: str(c).title() for c in df.columns})
    missing = [c for c in OHLCV if c not in df.columns]
    if missing:
        raise DataUnavailable(f"data is missing columns: {missing}")
    df = df[OHLCV].copy()

    idx = pd.to_datetime(df.index, utc=True)
    df.index = idx.tz_convert(TZ)
    df.index.name = "Datetime"

    df = df[~df.index.duplicated(keep="first")].sort_index()
    df = df.dropna(subset=["Open", "High", "Low", "Close"])
    return df[df["High"] >= df["Low"]]


def load_from_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, index_col=0)
    return _normalize(df)


def load_from_yfinance(ticker: str, period: str, interval: str) -> pd.DataFrame:
    try:
        import yfinance as yf
    except ImportError as exc:  # pragma: no cover - dependency is declared
        raise DataUnavailable(f"yfinance is not installed: {exc}") from exc

    try:
        df = yf.download(
            ticker,
            period=period,
            interval=interval,
            progress=False,
            auto_adjust=False,
        )
    except Exception as exc:
        raise DataUnavailable(f"yfinance download failed: {exc}") from exc

    if df is None or df.empty:
        raise DataUnavailable(
            f"yfinance returned no rows for {ticker} "
            f"(period={period}, interval={interval})"
        )
    return _normalize(df)


def synthetic_data(days: int, interval_minutes: int, seed: int = 20260901) -> pd.DataFrame:
    """Deterministic stand-in for NTT intraday bars. NOT market data."""
    rng = np.random.default_rng(seed)

    sessions = [(time(9, 0), time(11, 30)), (time(12, 30), time(15, 30))]
    step = timedelta(minutes=interval_minutes)

    day = pd.Timestamp.now(tz=TZ).normalize() - pd.Timedelta(days=1)
    dates: list[pd.Timestamp] = []
    while len(dates) < days:
        if day.weekday() < 5:
            dates.append(day)
        day -= pd.Timedelta(days=1)
    dates.reverse()

    price = 152.0
    rows, stamps = [], []
    bar_sigma = 0.0016  # per-bar volatility

    for date in dates:
        # Some sessions trend, most chop -- this is what a breakout system trades.
        trend = rng.choice([0.0, 1.0, -1.0], p=[0.55, 0.225, 0.225])
        drift = trend * rng.uniform(0.0004, 0.0011)
        price *= math.exp(rng.normal(0.0, 0.006))  # overnight gap

        for start, end in sessions:
            t = date.replace(hour=start.hour, minute=start.minute)
            stop = date.replace(hour=end.hour, minute=end.minute)
            while t < stop:
                open_ = price
                ret = drift + rng.normal(0.0, bar_sigma)
                close = open_ * math.exp(ret)
                hi = max(open_, close) * (1 + abs(rng.normal(0, 0.0007)))
                lo = min(open_, close) * (1 - abs(rng.normal(0, 0.0007)))
                rows.append(
                    (
                        round(open_, 1),
                        round(hi, 1),
                        round(lo, 1),
                        round(close, 1),
                        float(rng.integers(30_000, 900_000)),
                    )
                )
                stamps.append(t)
                price = close
                t += step

    df = pd.DataFrame(rows, columns=OHLCV, index=pd.DatetimeIndex(stamps, name="Datetime"))
    return _normalize(df)


def load_data(args) -> tuple[pd.DataFrame, str]:
    """Return (bars, source_label), falling back only when allowed."""
    if args.csv:
        return load_from_csv(args.csv), f"csv:{args.csv}"

    try:
        df = load_from_yfinance(args.ticker, args.period, args.interval)
        return df, f"yfinance:{args.ticker} {args.period}/{args.interval}"
    except DataUnavailable as exc:
        if args.fallback == "error":
            raise
        print(f"[warn] {exc}", file=sys.stderr)
        print(
            "[warn] Falling back to SYNTHETIC data. Results below are a pipeline\n"
            "[warn] demonstration only -- they say nothing about real NTT returns.",
            file=sys.stderr,
        )
        interval_minutes = int(str(args.interval).rstrip("m") or 5)
        return synthetic_data(args.synthetic_days, interval_minutes), "SYNTHETIC"


# --------------------------------------------------------------------------- #
# Backtest
# --------------------------------------------------------------------------- #
@dataclass
class Trade:
    date: str
    side: str
    entry_time: datetime
    entry: float
    exit_time: datetime
    exit: float
    shares: int
    stop: float
    target: float
    exit_reason: str
    gross_pnl: float
    costs: float
    pnl: float
    equity: float


@dataclass
class Params:
    or_minutes: int = 30
    stop_mult: float = 1.0
    target_mult: float = 2.0
    buffer_bps: float = 5.0
    risk_pct: float = 0.01
    capital: float = 1_000_000.0
    lot: int = 100
    commission_bps: float = 5.0
    slippage_bps: float = 3.0
    allow_short: bool = True
    max_trades_per_day: int = 1


def _size(equity: float, entry: float, stop: float, p: Params) -> int:
    risk_per_share = abs(entry - stop)
    if risk_per_share <= 0:
        return 0
    shares = (equity * p.risk_pct) / risk_per_share
    shares = min(shares, equity / entry)  # no leverage
    return int(shares // p.lot) * p.lot


def run_backtest(df: pd.DataFrame, p: Params) -> tuple[list[Trade], pd.Series]:
    trades: list[Trade] = []
    equity = p.capital
    daily_equity: dict[pd.Timestamp, float] = {}
    buf = p.buffer_bps / 10_000.0
    slip = p.slippage_bps / 10_000.0
    comm = p.commission_bps / 10_000.0

    for date, bars in df.groupby(df.index.date, sort=True):
        session_start = bars.index[0]
        or_end = session_start + pd.Timedelta(minutes=p.or_minutes)
        opening = bars[bars.index < or_end]
        rest = bars[bars.index >= or_end]

        if len(opening) < 2 or len(rest) < 2:
            daily_equity[pd.Timestamp(date)] = equity
            continue

        or_high = float(opening["High"].max())
        or_low = float(opening["Low"].min())
        or_range = or_high - or_low
        if or_range <= 0:
            daily_equity[pd.Timestamp(date)] = equity
            continue

        long_trigger = or_high * (1 + buf)
        short_trigger = or_low * (1 - buf)

        taken = 0
        position = None  # dict once open
        last_idx = len(rest) - 1

        for i, (ts, bar) in enumerate(rest.iterrows()):
            o, h, l, c = (float(bar["Open"]), float(bar["High"]),
                          float(bar["Low"]), float(bar["Close"]))

            if position is None and taken < p.max_trades_per_day:
                side = None
                if h >= long_trigger:
                    side, level = "long", long_trigger
                elif p.allow_short and l <= short_trigger:
                    side, level = "short", short_trigger

                if side == "long":
                    fill = max(o, level) * (1 + slip)
                    stop = fill - p.stop_mult * or_range
                    target = fill + p.target_mult * or_range
                elif side == "short":
                    fill = min(o, level) * (1 - slip)
                    stop = fill + p.stop_mult * or_range
                    target = fill - p.target_mult * or_range

                if side:
                    shares = _size(equity, fill, stop, p)
                    if shares > 0:
                        taken += 1
                        position = {
                            "side": side, "entry": fill, "entry_time": ts,
                            "stop": stop, "target": target, "shares": shares,
                        }

            if position is None:
                continue

            side = position["side"]
            exit_price = exit_reason = None

            # Pessimistic ordering: assume the stop fills before the target.
            if side == "long":
                if l <= position["stop"]:
                    exit_price, exit_reason = position["stop"] * (1 - slip), "stop"
                elif h >= position["target"]:
                    exit_price, exit_reason = position["target"] * (1 - slip), "target"
            else:
                if h >= position["stop"]:
                    exit_price, exit_reason = position["stop"] * (1 + slip), "stop"
                elif l <= position["target"]:
                    exit_price, exit_reason = position["target"] * (1 + slip), "target"

            if exit_price is None and i == last_idx:
                exit_price = c * (1 - slip) if side == "long" else c * (1 + slip)
                exit_reason = "session_close"

            if exit_price is None:
                continue

            shares = position["shares"]
            direction = 1 if side == "long" else -1
            gross = (exit_price - position["entry"]) * shares * direction
            costs = (position["entry"] + exit_price) * shares * comm
            pnl = gross - costs
            equity += pnl

            trades.append(
                Trade(
                    date=str(date), side=side,
                    entry_time=position["entry_time"], entry=round(position["entry"], 3),
                    exit_time=ts, exit=round(exit_price, 3), shares=shares,
                    stop=round(position["stop"], 3), target=round(position["target"], 3),
                    exit_reason=exit_reason, gross_pnl=round(gross, 2),
                    costs=round(costs, 2), pnl=round(pnl, 2), equity=round(equity, 2),
                )
            )
            position = None

        daily_equity[pd.Timestamp(date)] = equity

    curve = pd.Series(daily_equity, name="equity").sort_index()
    return trades, curve


# --------------------------------------------------------------------------- #
# Metrics and reporting
# --------------------------------------------------------------------------- #
def metrics(trades: list[Trade], curve: pd.Series, p: Params) -> dict:
    pnl = np.array([t.pnl for t in trades], dtype=float)
    wins, losses = pnl[pnl > 0], pnl[pnl <= 0]
    gross_profit, gross_loss = wins.sum(), -losses.sum()

    if len(curve) > 1:
        rets = curve.pct_change().dropna()
        sharpe = (rets.mean() / rets.std() * math.sqrt(252)) if rets.std() > 0 else 0.0
        peak = curve.cummax()
        dd = curve - peak
        max_dd, max_dd_pct = float(dd.min()), float((dd / peak).min() * 100)
    else:
        sharpe = max_dd = max_dd_pct = 0.0

    final = float(curve.iloc[-1]) if len(curve) else p.capital
    return {
        "sessions": int(len(curve)),
        "trades": len(trades),
        "wins": int(len(wins)),
        "losses": int(len(losses)),
        "win_rate_pct": round(100 * len(wins) / len(trades), 2) if trades else 0.0,
        "gross_profit": round(float(gross_profit), 2),
        "gross_loss": round(float(gross_loss), 2),
        "total_costs": round(sum(t.costs for t in trades), 2),
        "profit_factor": round(float(gross_profit / gross_loss), 3) if gross_loss > 0 else float("inf"),
        "net_pnl": round(final - p.capital, 2),
        "return_pct": round(100 * (final / p.capital - 1), 3),
        "avg_trade": round(float(pnl.mean()), 2) if trades else 0.0,
        "avg_win": round(float(wins.mean()), 2) if len(wins) else 0.0,
        "avg_loss": round(float(losses.mean()), 2) if len(losses) else 0.0,
        "best_trade": round(float(pnl.max()), 2) if trades else 0.0,
        "worst_trade": round(float(pnl.min()), 2) if trades else 0.0,
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_pct": round(max_dd_pct, 2),
        "sharpe_daily_ann": round(float(sharpe), 3),
        "final_equity": round(final, 2),
    }


def print_report(trades, curve, p, source, m) -> None:
    bar = "=" * 66
    print(bar)
    print(f"NTT ({TICKER}) opening-range day-trade backtest")
    print(bar)
    if source == "SYNTHETIC":
        print("!! SYNTHETIC DATA -- not real NTT prices. Illustrative only. !!")
    print(f"data source     : {source}")
    if len(curve):
        print(f"period          : {curve.index[0].date()} -> {curve.index[-1].date()}")
    print(
        f"params          : OR={p.or_minutes}m stop={p.stop_mult}xOR "
        f"target={p.target_mult}xOR buffer={p.buffer_bps}bps "
        f"risk={p.risk_pct:.1%} short={'on' if p.allow_short else 'off'}"
    )
    print(
        f"costs           : commission {p.commission_bps}bps/side, "
        f"slippage {p.slippage_bps}bps/side"
    )
    print("-" * 66)
    for k, v in m.items():
        print(f"{k:<20}: {v}")

    if trades:
        print("-" * 66)
        by_reason = pd.Series([t.exit_reason for t in trades]).value_counts()
        print("exits by reason     : " + ", ".join(f"{k}={v}" for k, v in by_reason.items()))
        for side in ("long", "short"):
            sub = [t.pnl for t in trades if t.side == side]
            if sub:
                w = sum(1 for x in sub if x > 0)
                print(
                    f"{side:<20}: {len(sub)} trades, "
                    f"win {100*w/len(sub):.1f}%, net {sum(sub):,.0f}"
                )
        print("-" * 66)
        print("last 10 trades:")
        cols = ["date", "side", "entry", "exit", "shares", "exit_reason", "pnl", "equity"]
        tail = pd.DataFrame([asdict(t) for t in trades])[cols].tail(10)
        print(tail.to_string(index=False))
    print(bar)


def save_outputs(trades, curve, source, prefix: str) -> list[str]:
    written = []
    if trades:
        path = f"{prefix}_trades.csv"
        pd.DataFrame([asdict(t) for t in trades]).to_csv(path, index=False)
        written.append(path)
    if len(curve):
        path = f"{prefix}_equity.csv"
        curve.to_csv(path, header=True)
        written.append(path)

        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig, (ax1, ax2) = plt.subplots(
                2, 1, figsize=(11, 7), sharex=True,
                gridspec_kw={"height_ratios": [3, 1]},
            )
            title = f"NTT ({TICKER}) opening-range day trade -- equity"
            if source == "SYNTHETIC":
                title += "  [SYNTHETIC DATA]"
            ax1.plot(curve.index, curve.to_numpy(), lw=1.6, color="#2b6cb0")
            ax1.set_title(title)
            ax1.set_ylabel("Equity (JPY)")
            ax1.grid(alpha=0.3)

            peak = curve.cummax()
            ddp = (curve / peak - 1) * 100
            ax2.fill_between(curve.index, ddp.to_numpy(), 0, color="#c53030", alpha=0.4)
            ax2.set_ylabel("Drawdown (%)")
            ax2.set_xlabel("Session")
            ax2.grid(alpha=0.3)

            fig.autofmt_xdate()
            fig.tight_layout()
            png = f"{prefix}_equity.png"
            fig.savefig(png, dpi=130)
            plt.close(fig)
            written.append(png)
        except Exception as exc:  # plotting must never fail the backtest
            print(f"[warn] plot skipped: {exc}", file=sys.stderr)
    return written


def run_sweep(df: pd.DataFrame, base: Params) -> None:
    rows = []
    for or_min in (15, 30, 45, 60):
        for stop_mult in (0.5, 1.0, 1.5):
            for target_mult in (1.0, 2.0, 3.0):
                p = Params(**{**asdict(base), "or_minutes": or_min,
                              "stop_mult": stop_mult, "target_mult": target_mult})
                t, c = run_backtest(df, p)
                m = metrics(t, c, p)
                rows.append({
                    "or_min": or_min, "stop": stop_mult, "target": target_mult,
                    "trades": m["trades"], "win%": m["win_rate_pct"],
                    "pf": m["profit_factor"], "return%": m["return_pct"],
                    "maxdd%": m["max_drawdown_pct"],
                })
    out = pd.DataFrame(rows).sort_values("return%", ascending=False)
    print("\nParameter sweep (sorted by return; in-sample, overfitting risk):")
    print(out.head(12).to_string(index=False))


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ticker", default=TICKER)
    ap.add_argument("--period", default="60d", help="yfinance period (5m bars: 60d max)")
    ap.add_argument("--interval", default="5m", help="bar interval, e.g. 1m/5m/15m")
    ap.add_argument("--csv", help="load bars from a local CSV instead of downloading")
    ap.add_argument("--fallback", choices=["synthetic", "error"], default="synthetic",
                    help="what to do when live data is unavailable")
    ap.add_argument("--synthetic-days", type=int, default=60)
    ap.add_argument("--or-minutes", type=int, default=30)
    ap.add_argument("--stop-mult", type=float, default=1.0)
    ap.add_argument("--target-mult", type=float, default=2.0)
    ap.add_argument("--buffer-bps", type=float, default=5.0)
    ap.add_argument("--risk-pct", type=float, default=0.01)
    ap.add_argument("--capital", type=float, default=1_000_000.0)
    ap.add_argument("--lot", type=int, default=100)
    ap.add_argument("--commission-bps", type=float, default=5.0)
    ap.add_argument("--slippage-bps", type=float, default=3.0)
    ap.add_argument("--no-short", action="store_true", help="long-only")
    ap.add_argument("--max-trades-per-day", type=int, default=1)
    ap.add_argument("--sweep", action="store_true", help="also run a parameter grid")
    ap.add_argument("--save-data", help="write the loaded bars to this CSV")
    ap.add_argument("--out-prefix", default="ntt_daytrade")
    return ap.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    try:
        df, source = load_data(args)
    except DataUnavailable as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1

    if df.empty:
        print("[error] no usable bars after cleaning", file=sys.stderr)
        return 1

    if args.save_data:
        df.to_csv(args.save_data)
        print(f"[info] bars written to {args.save_data}")

    print(f"[info] {len(df):,} bars over {df.index.normalize().nunique()} sessions")

    p = Params(
        or_minutes=args.or_minutes, stop_mult=args.stop_mult,
        target_mult=args.target_mult, buffer_bps=args.buffer_bps,
        risk_pct=args.risk_pct, capital=args.capital, lot=args.lot,
        commission_bps=args.commission_bps, slippage_bps=args.slippage_bps,
        allow_short=not args.no_short, max_trades_per_day=args.max_trades_per_day,
    )

    trades, curve = run_backtest(df, p)
    print_report(trades, curve, p, source, metrics(trades, curve, p))

    for path in save_outputs(trades, curve, source, args.out_prefix):
        print(f"[info] wrote {path}")

    if args.sweep:
        run_sweep(df, p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
