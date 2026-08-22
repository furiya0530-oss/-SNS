"""
screening.py : このツールの“計算エンジン”。

■ このファイルの役割
    data_loader.py が用意した「きれいな表」を受け取り、
    要件定義書 6.1(標準スクリーニング条件)と 6.2(独自条件)の数値を計算します。

■ このファイルが守っているルール
    - データをどこから取ってきたか(CSVかAPIか)は一切気にしない
    - 画面の都合(Streamlit)も一切気にしない
    → だからフェーズ2でAPI連携になっても、このファイルは書き換え不要です。

■ 計算の大原則:必ず「銘柄ごと」に計算する
    表には複数の銘柄が縦に並んでいます。何も考えずに「1行上の終値」を前日終値として使うと、
    銘柄の切れ目で “前の銘柄の最終日” を前日として拾ってしまいます。
    これを防ぐため、前日比や移動平均は必ず groupby("銘柄コード") を挟んで計算します。
    ※ groupby = 「銘柄コードごとにグループ分けしてから処理する」という pandas の機能。
"""

import pandas as pd

# ------------------------------------------------------------
# 初期しきい値(要件定義書の「初期しきい値」に対応)
# 画面のスライダーの初期位置としても使います。
# ここを1か所直せば、画面もロジックも同時に変わるようにまとめてあります。
# ------------------------------------------------------------
DEFAULTS = {
    # --- 標準条件 ---
    "turnover_min": 1_000_000_000,   # 売買代金:10億円以上
    "volume_spike_min": 2.0,         # 出来高急増率:2倍以上
    "range_rate_min": 0.03,          # 日中値幅率:3%以上(前日終値基準)
    "gap_rate_min": 0.02,            # ギャップ率:±2%以上(絶対値で判定)
    "volume_lookback": 5,            # 出来高平均を取る日数
    # --- 独自条件(レンジ回帰型ボラティリティ) ---
    "rr_range_min": 0.03,            # 値幅率しきい値:3%以上(始値基準)
    "rr_body_max": 0.01,             # 実体比率しきい値:1%以下
    "rr_days": 10,                   # 判定対象の日数 N
    "rr_ratio_min": 0.60,            # 条件を満たす日の割合しきい値:60%
}


# ============================================================
# 1. 標準スクリーニング条件(要件定義書 6.1)
#    指示書の指定どおり、1指標=1関数に分けています。
#    どの関数も「表を受け取り、計算結果の列(pandasのSeries)を返す」形に統一しました。
#    ※ Series = 表の1列分のデータ。行数は元の表と同じです。
# ============================================================

def calc_turnover(df):
    """
    売買代金 = 終値 × 出来高

    その銘柄に1日でどれだけのお金が流れたかを表す指標です。
    デイトレでは、これが小さい銘柄は「買えても売れない(流動性リスク)」ため除外します。
    """
    return df["終値"] * df["出来高"]


def calc_volume_spike(df, lookback=DEFAULTS["volume_lookback"]):
    """
    出来高急増率 = 当日の出来高 ÷ 過去◯日の平均出来高(初期値5日)

    ■ ポイント:平均には「当日」を含めません
        当日を含めてしまうと、出来高が急増した当日の数字が平均を押し上げ、
        急増率が実際より小さく出てしまう(=急増を見逃す)ためです。
        そこで shift(1) で1日ずらしてから平均を取っています。

    ※ 最初の数日は平均を出すためのデータが足りないため、結果は NaN(空)になります。
    """
    return df["出来高"] / (
        df.groupby("銘柄コード")["出来高"]
        .transform(lambda s: s.shift(1).rolling(lookback).mean())
    )


def calc_prev_close(df):
    """前日終値を取り出す(他の計算の土台になるので独立させています)。"""
    # shift(1) = 1行下にずらす、つまり「1日前の値」を持ってくる操作です。
    return df.groupby("銘柄コード")["終値"].shift(1)


def calc_daily_range_rate(df):
    """
    日中値幅率(標準条件版) = (高値 − 安値) ÷ 前日終値

    その日どれだけ上下に動いたかを、前日の株価を基準に%で表します。
    ※ 独自条件では同じ「日中値幅率」でも“始値で割る”定義を使います(後述)。
       要件定義書で定義が違うため、あえて別々に計算し、別の列名で保持します。
    """
    return (df["高値"] - df["安値"]) / calc_prev_close(df)


def calc_gap_rate(df):
    """
    ギャップ率 = (始値 − 前日終値) ÷ 前日終値

    前日の引けからどれだけ跳んで寄り付いたか。
    プラスなら上に跳んだ(ギャップアップ)、マイナスなら下に跳んだ(ギャップダウン)。
    判定では「上下どちらでも大きく跳べばよい」ので、絶対値で比較します。
    """
    prev_close = calc_prev_close(df)
    return (df["始値"] - prev_close) / prev_close


def calc_ma_deviation(df, short=5, long=25):
    """
    移動平均(5日・25日)との位置関係を計算する。

    ※ 移動平均線 = 直近◯日の終値の平均を結んだ線。株価の“ならした流れ”を見る道具。

    返すもの(4列ぶんの表):
        MA5 / MA25   : 5日・25日移動平均の値
        MA5乖離率     : (終値 − MA5) ÷ MA5。プラスなら平均より上にいる
        MA25乖離率    : 同上(25日)

    ※ 25日移動平均には25日分のデータが必要なので、それ未満の銘柄は NaN になります。
    """
    grouped = df.groupby("銘柄コード")["終値"]
    ma_short = grouped.transform(lambda s: s.rolling(short).mean())
    ma_long = grouped.transform(lambda s: s.rolling(long).mean())

    return pd.DataFrame({
        f"MA{short}": ma_short,
        f"MA{long}": ma_long,
        f"MA{short}乖離率": (df["終値"] - ma_short) / ma_short,
        f"MA{long}乖離率": (df["終値"] - ma_long) / ma_long,
    }, index=df.index)


def calc_ma_cross(df, short=5, long=25):
    """
    移動平均の「上抜け/下抜け直後」を判定する。

    要件の「上抜け/下抜け直後」を、次のように定義しました:
        上抜け … 前日は終値が5日移動平均より下、当日は上 (下→上に切り替わった日)
        下抜け … その逆

    ■ なぜ5日移動平均を使うか
        デイトレは数日〜1日で完結する取引なので、25日線のような長い線より、
        直近の勢いの変化に早く反応する5日線のほうが「入るきっかけ」として実用的なためです。
        25日線との位置関係は「乖離率」として別途スコアに使います。

    戻り値: "上抜け" / "下抜け" / "" のいずれかが入った列
    """
    ma = df.groupby("銘柄コード")["終値"].transform(lambda s: s.rolling(short).mean())

    above = df["終値"] > ma                                  # 当日:平均より上か
    above_prev = above.groupby(df["銘柄コード"]).shift(1)      # 前日:平均より上だったか

    result = pd.Series("", index=df.index, dtype=object)
    result[(above) & (above_prev == False)] = "上抜け"
    result[(~above) & (above_prev == True)] = "下抜け"
    # 移動平均がまだ計算できない期間(NaN)は判定不能なので空欄のままにします。
    result[ma.isna()] = ""
    return result


# ============================================================
# 2. 独自条件:レンジ回帰型ボラティリティ銘柄の検出(要件定義書 6.2)
#    ★ここがこのツールの核心です★
# ============================================================

def calc_range_return_metrics(df):
    """
    独自条件で使う2つの指標を、全日分について計算する。

        日中値幅率(始値基準) = (高値 − 安値) ÷ 始値
        実体比率              = |始値 − 終値| ÷ 始値

    ■ なぜ2つとも「始値」で割るのか
        狙っているのは「その日1日の中で大きく動いたのに、結局スタート地点に戻ってきた」形です。
        これは“その日の中だけで完結する話”なので、前日終値ではなく、
        その日のスタートである始値を共通のものさしにします。
        分母を揃えることで、値幅率と実体比率を同じ土俵で比べられるようになります。

    ■ 「実体」とは
        ローソク足の四角い部分(始値と終値の間)のこと。
        実体が小さい = 始値と終値がほぼ同じ = その日の方向感が出なかった、という意味になります。

    戻り値: 元の表に「値幅率(始値基準)」「実体比率」の2列を足した表
    """
    df = df.copy()

    # ゼロ割り(0で割る)を防ぐため、始値が0以下の異常データは NaN 扱いにします。
    # 実データでは起きにくいですが、壊れたCSVを読ませたときに変な結果を出さないための保険です。
    safe_open = df["始値"].where(df["始値"] > 0)

    df["値幅率(始値基準)"] = (df["高値"] - df["安値"]) / safe_open
    df["実体比率"] = (df["始値"] - df["終値"]).abs() / safe_open
    return df


def flag_range_return_days(df, range_min=DEFAULTS["rr_range_min"], body_max=DEFAULTS["rr_body_max"]):
    """
    1日ごとに「条件を満たす日(=該当日)かどうか」の○×を付ける。

        該当日の定義:
            値幅率(始値基準) >= range_min  (よく動いた)
            かつ
            実体比率          <= body_max   (なのに始値と終値はほぼ同じ)

    ■ なぜ“かつ”なのか(ここが独自条件の肝)
        - 値幅だけ大きい日 → ただのトレンド発生日かもしれない(一方向に動いただけ)
        - 実体だけ小さい日 → ただ動かなかっただけの日かもしれない
        両方を同時に満たして初めて「大きく動いたのに行って来いで戻った」形になります。
        サンプルデータの「上昇トレンド薬品」(値幅だけ大)と「静かなインフラ」(実体だけ小)は、
        この“かつ”が正しく効いているかを確かめるために用意した対照データです。

    戻り値: 「値幅率(始値基準)」「実体比率」「該当日」の3列が足された表
    """
    df = calc_range_return_metrics(df)
    df["該当日"] = (df["値幅率(始値基準)"] >= range_min) & (df["実体比率"] <= body_max)
    return df


def evaluate_range_return(
    df,
    range_min=DEFAULTS["rr_range_min"],
    body_max=DEFAULTS["rr_body_max"],
    days=DEFAULTS["rr_days"],
    ratio_min=DEFAULTS["rr_ratio_min"],
):
    """
    銘柄ごとに「直近N日のうち何割が該当日か」を集計する。

    引数:
        range_min : 値幅率しきい値      (初期値 0.03)
        body_max  : 実体比率しきい値    (初期値 0.01)
        days      : 判定対象の日数 N    (初期値 10)
        ratio_min : 割合しきい値        (初期値 0.60)

    戻り値: (集計結果の表, ○×履歴つきの全日データ)
        集計結果の列:
            銘柄コード / 銘柄名 / 判定日数 / 該当日数 / 該当割合 / 独自スコア / 独自条件クリア
        ※ 独自スコア = 該当割合(0〜1)。要件どおり、割合そのものをスコアにしています。
          高いほど「レンジ回帰の状態が長く続いている」ことを意味します。
    """
    flagged = flag_range_return_days(df, range_min, body_max)

    rows = []
    for code, group in flagged.groupby("銘柄コード"):
        # 日付順に並べたうえで、末尾からN日分(=直近N日)だけを切り出します。
        recent = group.sort_values("日付").tail(days)

        # データがN日に満たない銘柄でも、あるだけの日数で割合を計算します(0除算は回避)。
        n = len(recent)
        hit = int(recent["該当日"].sum())
        ratio = hit / n if n > 0 else 0.0

        rows.append({
            "銘柄コード": code,
            "銘柄名": recent["銘柄名"].iloc[-1],
            "判定日数": n,
            "該当日数": hit,
            "該当割合": ratio,
            "独自スコア": ratio,
            "独自条件クリア": ratio >= ratio_min,
        })

    summary = pd.DataFrame(rows)
    if not summary.empty:
        summary = summary.sort_values("独自スコア", ascending=False).reset_index(drop=True)

    return summary, flagged


# ============================================================
# 3. 標準条件の判定と、銘柄ごとの最新状況のまとめ
# ============================================================

def add_standard_indicators(df, volume_lookback=DEFAULTS["volume_lookback"]):
    """標準条件で使う指標をまとめて計算し、列として追加した表を返す。"""
    df = df.copy()

    df["前日終値"] = calc_prev_close(df)
    df["売買代金"] = calc_turnover(df)
    df["出来高急増率"] = calc_volume_spike(df, volume_lookback)
    df["日中値幅率"] = calc_daily_range_rate(df)
    df["ギャップ率"] = calc_gap_rate(df)
    df = pd.concat([df, calc_ma_deviation(df)], axis=1)
    df["MAクロス"] = calc_ma_cross(df)

    return df


def evaluate_standard(
    df,
    turnover_min=DEFAULTS["turnover_min"],
    volume_spike_min=DEFAULTS["volume_spike_min"],
    range_rate_min=DEFAULTS["range_rate_min"],
    gap_rate_min=DEFAULTS["gap_rate_min"],
    volume_lookback=DEFAULTS["volume_lookback"],
):
    """
    銘柄ごとに「最新日」の標準条件の充足状況を判定する。

    ■ なぜ最新日だけを見るのか
        標準条件は「今日この銘柄を触るべきか」を判断するための条件だからです。
        (対して独自条件は「この状態が続いているか」を見るため、直近N日を使います)

    戻り値: (判定結果の表, 指標が追加された全日データ)
        判定結果には各条件の○×(True/False)と、満たした数(標準条件充足数)が入ります。
    """
    enriched = add_standard_indicators(df, volume_lookback)

    rows = []
    for code, group in enriched.groupby("銘柄コード"):
        latest = group.sort_values("日付").iloc[-1]  # その銘柄の最新日の行

        # NaN(データ不足で計算できなかった値)は「条件を満たさない」として扱います。
        # 比較の前に fillna しておかないと、NaN との比較が常に False になり、
        # 「なぜ満たさないのか」が追いにくいバグの原因になるためです。
        turnover = latest["売買代金"]
        spike = latest["出来高急増率"]
        range_rate = latest["日中値幅率"]
        gap_rate = latest["ギャップ率"]

        ok_turnover = bool(pd.notna(turnover) and turnover >= turnover_min)
        ok_spike = bool(pd.notna(spike) and spike >= volume_spike_min)
        ok_range = bool(pd.notna(range_rate) and range_rate >= range_rate_min)
        # ギャップは上下どちらでもよいので絶対値(abs)で比較します。
        ok_gap = bool(pd.notna(gap_rate) and abs(gap_rate) >= gap_rate_min)
        ok_ma = latest["MAクロス"] in ("上抜け", "下抜け")

        rows.append({
            "銘柄コード": code,
            "銘柄名": latest["銘柄名"],
            "最新日": latest["日付"],
            "終値": latest["終値"],
            "売買代金": turnover,
            "出来高急増率": spike,
            "日中値幅率": range_rate,
            "ギャップ率": gap_rate,
            "MAクロス": latest["MAクロス"],
            "MA5乖離率": latest["MA5乖離率"],
            "MA25乖離率": latest["MA25乖離率"],
            "売買代金OK": ok_turnover,
            "出来高急増OK": ok_spike,
            "値幅OK": ok_range,
            "ギャップOK": ok_gap,
            "移動平均OK": ok_ma,
        })

    result = pd.DataFrame(rows)
    if not result.empty:
        # 5つの条件のうちいくつ満たしたか。あとでスコア化に使います。
        flag_columns = ["売買代金OK", "出来高急増OK", "値幅OK", "ギャップOK", "移動平均OK"]
        result["標準条件充足数"] = result[flag_columns].sum(axis=1)

    return result, enriched


# 動作確認用:「python screening.py」で独自条件の結果を表示します。
if __name__ == "__main__":
    from data_loader import load_sample_data

    data = load_sample_data()
    summary, _ = evaluate_range_return(data)
    print("=== 独自条件(レンジ回帰型)の判定結果 ===")
    print(summary.to_string(index=False))
