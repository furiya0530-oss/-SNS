# -SNS

## NTT day-trade backtest

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/furiya0530-oss/-SNS/blob/main/ntt_daytrade_colab.ipynb)

iPad やスマホから動かすなら、上のバッジをタップして Colab で開き、
「ランタイム」→「すべてのセルを実行」だけで結果が出ます
(`ntt_daytrade_colab.ipynb`)。ローカルで動かす場合は以下を参照してください。

`ntt_daytrade_backtest.py` backtests an intraday opening-range breakout (ORB) on
NTT (`9432.T`, Tokyo Stock Exchange). It is a day-trading model: at most one
position per session, and always flat by the close.

### Install and run

```bash
pip install -r requirements.txt      # or: pip install yfinance pandas numpy matplotlib
python ntt_daytrade_backtest.py
```

Yahoo caps 5-minute history at 60 days and 1-minute history at 7, so the default
is `--period 60d --interval 5m`.

### Strategy

* The opening range is the high/low of the first `--or-minutes` of the session.
* A break above the OR high (plus a `--buffer-bps` filter) goes long; a break
  below the OR low goes short (`--no-short` for long-only).
* Stop and target are multiples of the OR height (`--stop-mult`, `--target-mult`).
* Anything still open on the session's last bar is closed at that bar's close.
* Size is risk-based: `--risk-pct` of equity per trade divided by the per-share
  stop distance, rounded down to `--lot` (100) shares, never leveraged.
* Commission and slippage are charged per side, in basis points.

Fill conventions, chosen to avoid flattering the results: entries fill at the
breakout level (or the bar open if the bar gapped through it), slippage always
works against the trade, and when one bar spans both stop and target the stop is
assumed to fill first.

### Data sources

Tried in order: `--csv FILE`, then a yfinance download, then a **synthetic**
deterministic fallback so the pipeline runs where Yahoo is unreachable. Synthetic
runs are labelled in the console output and on the chart; use `--fallback error`
to fail instead, and `--save-data bars.csv` to cache real bars for offline reruns.

### Outputs

`ntt_daytrade_trades.csv` (trade log), `ntt_daytrade_equity.csv`, and
`ntt_daytrade_equity.png` (equity curve and drawdown). `--sweep` adds an
in-sample parameter grid — useful for sensitivity, not for picking parameters.
