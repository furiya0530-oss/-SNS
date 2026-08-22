"""
sample.csv(動作確認用の架空の株価データ)を作り直すためのスクリプト。

■ このファイルの役割
    スクリーニングロジックが「狙いどおりに動いているか」を確かめるには、
    “答えが分かっているデータ”が必要です。
    ランダムなデータだと、上位に来た銘柄が正解なのか偶然なのか判断できません。
    そこで、銘柄ごとに「性格(値動きのクセ)」をあらかじめ決め打ちして生成します。

■ 使い方(普段は実行不要。データを作り直したいときだけ)
    python sample_data/generate_sample.py

■ 銘柄の設計(=期待される判定結果)
    1001 レンジ機械      : 値幅大・実体小が毎日続く   → 独自条件で最上位に来るはず
    1002 ボラ電子        : 同上(やや弱い)           → 独自条件で上位に来るはず
    1003 きわどい商事    : 該当日が約半分            → 初期値60%では落ちる(境界テスト用)
    2001 上昇トレンド薬品: 値幅は大きいが実体も大きい → 独自条件では落ちるはず
    2002 下落トレンド銀行: 同上(下向き)             → 独自条件では落ちるはず
    3001 静かなインフラ  : そもそも値幅が小さい       → 独自条件では落ちるはず
    3002 出来高急増テック: 普段は静か→最終日に急騰   → 標準条件(出来高急増・ギャップ)だけ光る
    4001 低流動性テスト  : レンジ型だが売買代金が小さい → 独自スコアは高いが売買代金条件で落ちる
"""

import numpy as np
import pandas as pd

# 乱数の「種(seed)」を固定します。
# こうすると、何度実行しても毎回まったく同じデータが作られます(再現性の確保)。
rng = np.random.default_rng(20260822)

# 何営業日分のデータを作るか。
# 要件上は20日程度でよいのですが、標準条件の「25日移動平均」を計算するには
# 25日以上のデータが必要なため、余裕をみて40営業日分にしています。
N_DAYS = 40

# 対象期間の日付を作ります。bdate_range は土日を自動で除いた「営業日」を返します。
# (祝日までは考慮しませんが、動作確認用としては十分です)
dates = pd.bdate_range(end="2026-08-21", periods=N_DAYS)


def make_one_day(prev_close, gap_rate, range_rate, body_rate, up_share):
    """
    1日分の4本値(始値・高値・安値・終値)を、狙った“形”になるように逆算して作る関数。

    ふつうは株価を乱数で動かして4本値を作りますが、それだと
    「値幅は大きいが実体は小さい」という狙った形を安定して作れません。
    そこで、先に欲しい比率を決めてから、そこに合う4本値を計算します。

    引数:
        prev_close : 前日の終値
        gap_rate   : 前日終値からどれだけ離れて寄り付くか(例 0.01 なら +1%)
        range_rate : 日中値幅率。(高値 − 安値) ÷ 始値 の目標値(例 0.04 なら 4%)
        body_rate  : 実体比率。|始値 − 終値| ÷ 始値 の目標値(例 0.005 なら 0.5%)
                     マイナスを渡すと陰線(終値が始値より安い)になります。
        up_share   : 値幅のうち、実体より上のヒゲに割り当てる割合(0〜1)

    戻り値: (始値, 高値, 安値, 終値)
    """
    open_price = prev_close * (1 + gap_rate)
    close_price = open_price * (1 + body_rate)

    # 実体(始値と終値の差)の絶対値。値幅は必ずこれ以上になる必要があります。
    body_abs = abs(close_price - open_price)
    target_range = open_price * range_rate

    # 万一「狙った値幅 < 実体」になってしまった場合は、値幅を実体より少し大きく補正します。
    # (高値・安値が実体の内側に入る、というあり得ない値になるのを防ぐため)
    if target_range < body_abs:
        target_range = body_abs * 1.05

    # 値幅から実体を引いた残りが、上下のヒゲに配分される分です。
    wick_total = target_range - body_abs
    upper_wick = wick_total * up_share
    lower_wick = wick_total * (1 - up_share)

    high_price = max(open_price, close_price) + upper_wick
    low_price = min(open_price, close_price) - lower_wick

    return open_price, high_price, low_price, close_price


def build_stock(code, name, start_price, base_volume, profile):
    """
    1銘柄分(N_DAYS日分)のデータを作る関数。

    profile は「その銘柄の性格」を決める関数で、
    「何日目か」を受け取って (gap_rate, range_rate, body_rate, volume_factor) を返します。
    銘柄ごとの違いはこの profile 関数だけで表現しています。
    """
    rows = []
    prev_close = start_price

    for i, date in enumerate(dates):
        gap_rate, range_rate, body_rate, volume_factor = profile(i)

        o, h, l, c = make_one_day(
            prev_close,
            gap_rate,
            range_rate,
            body_rate,
            up_share=rng.uniform(0.35, 0.65),  # ヒゲの上下配分は少しだけランダムに
        )

        volume = int(base_volume * volume_factor * rng.uniform(0.85, 1.15))

        rows.append(
            {
                "銘柄コード": code,
                "銘柄名": name,
                "日付": date.strftime("%Y-%m-%d"),
                # 株価は小数第1位まで(実際の株価に近い見た目にするため)
                "始値": round(o, 1),
                "高値": round(h, 1),
                "安値": round(l, 1),
                "終値": round(c, 1),
                "出来高": volume,
            }
        )
        prev_close = c  # 今日の終値が明日の「前日終値」になります

    return rows


# ============================================================
# ここから下が、銘柄ごとの「性格」の定義です。
# ============================================================

def profile_range_strong(i):
    """1001 レンジ機械:値幅は大きい(3.5〜5.5%)が実体はごく小さい(±0.6%以内)。
    ほぼ毎日が独自条件の“該当日”になるはずの、いちばん分かりやすい正解銘柄。"""
    return (
        rng.uniform(-0.004, 0.004),   # ギャップはほぼ無し
        rng.uniform(0.035, 0.055),    # 日中値幅率:大きい
        rng.uniform(-0.006, 0.006),   # 実体比率:小さい(=始値と終値がほぼ同じ)
        rng.uniform(0.9, 1.2),
    )


def profile_range_medium(i):
    """1002 ボラ電子:レンジ回帰型だが 1001 より少し弱い。
    ときどき実体が1%を超える日が混ざるので、該当割合は8割程度になる想定。"""
    if i % 5 == 0:
        # 5日に1回くらいは方向感の出る日を混ぜる(該当日にならない日)
        return (rng.uniform(-0.005, 0.005), rng.uniform(0.030, 0.045),
                rng.choice([-1, 1]) * rng.uniform(0.015, 0.025), rng.uniform(0.9, 1.3))
    return (
        rng.uniform(-0.005, 0.005),
        rng.uniform(0.031, 0.048),
        rng.uniform(-0.008, 0.008),
        rng.uniform(0.8, 1.2),
    )


def profile_borderline(i):
    """1003 きわどい商事:該当日と非該当日を交互に作り、割合をほぼ50%にする。
    「割合しきい値60%」で落ち、スライダーを50%に下げると出てくることを確認する境界テスト用。"""
    if i % 2 == 0:
        # 該当する日
        return (rng.uniform(-0.004, 0.004), rng.uniform(0.033, 0.045),
                rng.uniform(-0.007, 0.007), rng.uniform(0.9, 1.1))
    # 該当しない日(実体が大きい)
    return (rng.uniform(-0.006, 0.006), rng.uniform(0.030, 0.040),
            rng.choice([-1, 1]) * rng.uniform(0.018, 0.030), rng.uniform(0.9, 1.1))


def profile_uptrend(i):
    """2001 上昇トレンド薬品:値幅も大きいが実体も大きい(毎日しっかり上昇)。
    「値幅が大きい=独自条件に該当」ではないことを確認するための対照銘柄。"""
    return (
        rng.uniform(0.000, 0.008),
        rng.uniform(0.035, 0.055),
        rng.uniform(0.015, 0.030),    # 実体が大きい(陽線)ので該当日にならない
        rng.uniform(1.0, 1.4),
    )


def profile_downtrend(i):
    """2002 下落トレンド銀行:上昇トレンドの逆。毎日しっかり下落する。"""
    return (
        rng.uniform(-0.008, 0.000),
        rng.uniform(0.033, 0.050),
        -rng.uniform(0.015, 0.028),   # 実体が大きい(陰線)
        rng.uniform(1.0, 1.4),
    )


def profile_quiet(i):
    """3001 静かなインフラ:実体は小さいが、そもそも日中の値幅が小さい。
    「始値と終値が同じ=独自条件に該当」ではないことを確認するための対照銘柄。"""
    return (
        rng.uniform(-0.002, 0.002),
        rng.uniform(0.008, 0.016),    # 値幅率が小さいので該当日にならない
        rng.uniform(-0.004, 0.004),
        rng.uniform(0.9, 1.1),
    )


def profile_volume_spike(i):
    """3002 出来高急増テック:普段は静かだが、最終日だけ出来高が約4倍・
    上ギャップ+4%・値幅も大きくなる。標準条件(出来高急増率・ギャップ率)の確認用。"""
    if i == N_DAYS - 1:
        return (0.042, 0.070, 0.045, 4.0)
    return (
        rng.uniform(-0.004, 0.004),
        rng.uniform(0.010, 0.020),
        rng.uniform(-0.006, 0.006),
        rng.uniform(0.9, 1.1),
    )


def profile_illiquid(i):
    """4001 低流動性テスト:値動きの形は 1001 と同じレンジ回帰型。
    ただし株価も出来高も小さいので、売買代金(終値×出来高)が10億円に遠く届かない。
    「独自スコアは高いが、標準条件では弾かれる」ケースの確認用。"""
    return (
        rng.uniform(-0.004, 0.004),
        rng.uniform(0.036, 0.055),
        rng.uniform(-0.006, 0.006),
        rng.uniform(0.9, 1.1),
    )


def profile_staircase(i):
    """5001 階段上昇テスト:1日の形は 1001 とそっくり(値幅大・実体小)。
    違うのは毎日プラスのギャップで寄り付くこと。
    その結果、日々は行って来いに見えるのに、株価は階段状に上がり続ける。

    ■ なぜこの銘柄が必要か
        「値幅が大きく実体が小さい日」を数えるだけの判定では、この銘柄も満点になります。
        しかし実態はトレンド銘柄で、レンジ内で往復する狙いには合いません。
        終値レンジ幅の条件が、この引っかけを正しく除外できるかを確認します。"""
    return (
        rng.uniform(0.012, 0.018),    # 毎日プラスのギャップ(ここだけが 1001 との違い)
        rng.uniform(0.036, 0.052),    # 値幅は大きい
        rng.uniform(-0.006, 0.006),   # 実体は小さい
        rng.uniform(0.9, 1.2),
    )


# 銘柄コード, 銘柄名, 開始株価, 基準出来高, 性格を決める関数
STOCKS = [
    ("1001", "レンジ機械",       2500, 900_000,   profile_range_strong),
    ("1002", "ボラ電子",         1800, 1_500_000, profile_range_medium),
    ("1003", "きわどい商事",     3200, 700_000,   profile_borderline),
    ("2001", "上昇トレンド薬品", 4100, 800_000,   profile_uptrend),
    ("2002", "下落トレンド銀行", 1200, 2_500_000, profile_downtrend),
    ("3001", "静かなインフラ",   2100, 1_200_000, profile_quiet),
    ("3002", "出来高急増テック", 1500, 900_000,   profile_volume_spike),
    ("4001", "低流動性テスト",   820,  60_000,    profile_illiquid),
    ("5001", "階段上昇テスト",   1900, 1_100_000, profile_staircase),
]


def main():
    all_rows = []
    for code, name, price, volume, profile in STOCKS:
        all_rows.extend(build_stock(code, name, price, volume, profile))

    df = pd.DataFrame(all_rows)

    # 出力先はこのスクリプトと同じフォルダの sample.csv
    out_path = __file__.replace("generate_sample.py", "sample.csv")

    # encoding="utf-8-sig" は、Excelで開いても日本語が文字化けしない形式です。
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"作成しました: {out_path}")
    print(f"銘柄数: {df['銘柄コード'].nunique()} / 総行数: {len(df)}")


if __name__ == "__main__":
    main()
