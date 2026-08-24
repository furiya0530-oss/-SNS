"""
scoring.py : 点数付け(スコアリング)と並べ替えの係。

■ このファイルの役割
    screening.py が出した「標準条件の充足状況」と「ヨコヨコ条件のスコア」を
    1つの総合スコアにまとめ、高い順に並べた一覧表を作ります。

■ 設計の考え方:先にものさしを揃える
    標準条件は「5つのうち何個満たしたか(0〜5個)」、
    ヨコヨコ条件は「該当日の割合(0〜1)」で、そのままでは単位が違います。
    違う単位のまま足すと、重みを変えたときの効き方が直感と合わなくなるため、
    標準条件も 5 で割って 0〜1 に揃えてから重みを掛けています。
    → こうすると総合スコアも必ず 0〜1 に収まり、「1.0が満点」と分かりやすくなります。
"""

import pandas as pd

# 標準条件の○×が入っている列(この5つが「標準条件」の中身)
STANDARD_FLAG_COLUMNS = ["売買代金OK", "出来高急増OK", "値幅OK", "ギャップOK", "移動平均OK"]

# 重みの初期値。ヨコヨコ条件がこのツールの主眼なので、やや大きめに配分しています。
# (画面のスライダーで変更できます)
DEFAULT_WEIGHT_STANDARD = 0.4
DEFAULT_WEIGHT_UNIQUE = 0.6


def calc_standard_score(standard_df):
    """
    標準条件のスコア(0〜1)を計算する。

        標準スコア = 満たした条件の数 ÷ 条件の総数(5)

    すべての条件を同じ重さで扱う、いちばん素直な方法です。
    「どの条件を重視するか」は将来ここを変えれば調整できます。
    """
    return standard_df["標準条件充足数"] / len(STANDARD_FLAG_COLUMNS)


def combine_scores(
    standard_df,
    unique_df,
    weight_standard=DEFAULT_WEIGHT_STANDARD,
    weight_unique=DEFAULT_WEIGHT_UNIQUE,
):
    """
    標準条件とヨコヨコ条件を合体させ、総合スコア順に並べた一覧表を返す。

    引数:
        standard_df     : screening.evaluate_standard() の結果
        unique_df       : screening.evaluate_range_return() の結果
        weight_standard : 標準条件の重み(初期値 0.4)
        weight_unique   : ヨコヨコ条件の重み(初期値 0.6)

    総合スコア = (標準スコア × 標準の重み + ヨコヨコ度 × ヨコヨコ条件の重み) ÷ 重みの合計

    ■ なぜ重みの合計で割るのか
        重みを 0.4 / 0.6 以外(例:1.0 と 1.0)に変えても総合スコアが 0〜1 に収まるようにするためです。
        これを「加重平均」と呼びます。合計で割らないと、重みを大きくしただけで
        スコアが跳ね上がり、銘柄同士の比較ができなくなります。
    """
    # 銘柄コードをキーにして2つの表を横に連結します(merge = 表の結合)。
    # how="outer" にすると、どちらか片方にしかない銘柄も欠けずに残ります。
    unique_columns = [
        "銘柄コード", "判定日数", "該当日数", "該当割合", "直近重視割合",
        "連続該当日数", "終値レンジ幅", "レンジ内", "除外理由", "ヨコヨコ度", "ヨコヨコ銘柄",
    ]
    merged = pd.merge(
        standard_df,
        unique_df[unique_columns],
        on="銘柄コード",
        how="outer",
    )

    if merged.empty:
        return merged

    # 片方の表にしかなかった銘柄は、欠けている項目が NaN になります。
    # そのまま計算するとスコアも NaN になってしまうので、0(=条件を満たさない)で埋めます。
    merged["標準条件充足数"] = merged["標準条件充足数"].fillna(0)
    merged["ヨコヨコ度"] = merged["ヨコヨコ度"].fillna(0)
    merged["ヨコヨコ銘柄"] = merged["ヨコヨコ銘柄"].fillna(False).astype(bool)
    for col in STANDARD_FLAG_COLUMNS:
        merged[col] = merged[col].fillna(False).astype(bool)

    merged["標準スコア"] = calc_standard_score(merged)

    total_weight = weight_standard + weight_unique
    if total_weight <= 0:
        # 重みを両方0にされた場合のゼロ割り対策。均等配分として扱います。
        weight_standard = weight_unique = 0.5
        total_weight = 1.0

    merged["総合スコア"] = (
        merged["標準スコア"] * weight_standard + merged["ヨコヨコ度"] * weight_unique
    ) / total_weight

    # 総合スコアの高い順に並べ替え。同点の場合はヨコヨコ度、さらに同点なら
    # 連続該当日数が多いほう(=今も状態が続いているほう)を上にします。
    merged["連続該当日数"] = merged["連続該当日数"].fillna(0)
    merged = merged.sort_values(
        ["総合スコア", "ヨコヨコ度", "連続該当日数"], ascending=[False, False, False]
    ).reset_index(drop=True)

    return merged


def build_ranking(data, params):
    """
    【外から呼ぶのはこの関数】生データ1つとパラメータ一式から、最終的な一覧表を作る。

    app.py はこの関数を1回呼ぶだけでよく、
    「標準条件を計算 → ヨコヨコ条件を計算 → 合体して並べ替え」の順番を意識せずに済みます。

    引数:
        data   : data_loader が返した表
        params : しきい値をまとめた辞書(screening.DEFAULTS と同じキー + 重み)

    戻り値: (一覧表, ヨコヨコ条件の○×履歴つき全日データ, 標準指標つき全日データ, 除外された銘柄の表)
    """
    # import をファイルの先頭ではなく関数の中に書いているのは、
    # scoring.py 単体でも読みやすくするためです(循環インポートの予防も兼ねています)。
    import screening

    standard_df, enriched = screening.evaluate_standard(
        data,
        turnover_min=params["turnover_min"],
        volume_spike_min=params["volume_spike_min"],
        range_rate_min=params["range_rate_min"],
        gap_rate_min=params["gap_rate_min"],
        volume_lookback=params.get("volume_lookback", 5),
    )

    unique_df, flagged = screening.evaluate_range_return(
        data,
        range_min=params["rr_range_min"],
        body_max=params["rr_body_max"],
        days=params["rr_days"],
        ratio_min=params["rr_ratio_min"],
        band_max=params.get("rr_band_max", screening.DEFAULTS["rr_band_max"]),
        use_band=params.get("rr_use_band", screening.DEFAULTS["rr_use_band"]),
        score_mode=params.get("rr_score_mode", screening.DEFAULTS["rr_score_mode"]),
    )

    ranking = combine_scores(
        standard_df,
        unique_df,
        weight_standard=params.get("weight_standard", DEFAULT_WEIGHT_STANDARD),
        weight_unique=params.get("weight_unique", DEFAULT_WEIGHT_UNIQUE),
    )

    # --- 流動性による足切り ---
    # 売買代金が下限に届かない銘柄は、スコアが高くても実際には売買が成立しにくいため、
    # 「減点」ではなく「一覧から除外」します。
    # なぜ減点ではダメか:減点でも上位に残ってしまい、実際には手が出せない銘柄を
    # 追いかけることになるためです。除外した銘柄は別の表で返し、画面で確認できるようにします。
    if params.get("liquidity_filter", screening.DEFAULTS["liquidity_filter"]):
        excluded = ranking[~ranking["売買代金OK"]].copy()
        ranking = ranking[ranking["売買代金OK"]].copy()
    else:
        excluded = ranking.iloc[0:0].copy()   # 空の表(列の形は同じ)

    # 除外後に順位を振り直します(1位から欠番なく並ぶように)
    ranking = ranking.reset_index(drop=True)
    ranking.insert(0, "順位", range(1, len(ranking) + 1))

    return ranking, flagged, enriched, excluded


# 動作確認用:「python scoring.py」で総合ランキングを表示します。
if __name__ == "__main__":
    from data_loader import load_sample_data
    from screening import DEFAULTS

    data = load_sample_data()
    params = dict(DEFAULTS)
    params["weight_standard"] = DEFAULT_WEIGHT_STANDARD
    params["weight_unique"] = DEFAULT_WEIGHT_UNIQUE

    ranking, _, _, excluded = build_ranking(data, params)

    columns = ["順位", "銘柄コード", "銘柄名", "総合スコア", "標準スコア", "ヨコヨコ度",
               "連続該当日数", "標準条件充足数", "ヨコヨコ銘柄"]
    print("=== 総合ランキング ===")
    print(ranking[columns].to_string(index=False))
    if not excluded.empty:
        print("\n=== 売買代金の下限に届かず除外した銘柄 ===")
        print(excluded[["銘柄コード", "銘柄名", "売買代金", "ヨコヨコ度"]].to_string(index=False))
