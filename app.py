"""
app.py : ブラウザに表示する画面(Streamlitアプリ)。

■ 起動方法
    streamlit run app.py
    → 自動でブラウザが開きます(開かない場合は表示されたURLをブラウザに貼り付け)

■ Streamlit の仕組み(初心者向けの重要ポイント)
    Streamlit は「スライダーを動かす」「ボタンを押す」などの操作があるたびに、
    このファイルを上から下まで丸ごと再実行します。
    そのため、読み込んだCSVを普通の変数に入れておくと毎回消えてしまいます。
    そこで st.session_state という“操作をまたいで残る箱”にデータを保管します。

■ このファイルがやらないこと
    計算は一切しません。すべて screening.py / scoring.py に任せ、
    ここは「入力を受け取って結果を並べる」役に徹しています。
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import data_loader
import scoring
import screening

# ------------------------------------------------------------
# 画面全体の設定(いちばん最初に1回だけ呼ぶ決まりです)
# ------------------------------------------------------------
st.set_page_config(
    page_title="デイトレ銘柄スクリーニング",
    page_icon="📈",
    layout="wide",  # 横幅いっぱいに使う(表の列が多いため)
)

st.title("📈 デイトレ銘柄スクリーニングツール（フェーズ1）")
st.caption(
    "CSVの日足データから、標準条件と独自条件（レンジ回帰型ボラティリティ）で銘柄を絞り込みます。"
)


# ============================================================
# 1. データの読み込み(サイドバー上部)
# ============================================================
st.sidebar.header("1. データ")

uploaded = st.sidebar.file_uploader(
    "CSVファイルをアップロード",
    type=["csv"],
    help="必須の列: 銘柄コード, 銘柄名, 日付, 始値, 高値, 安値, 終値, 出来高",
)

use_sample = st.sidebar.button("サンプルデータを使う", width="stretch")

# --- 読み込み処理 ---
# アップロードされたファイルは、いきなり整形せず「生の表」としていったん受け取ります。
# 列名がCSVごとに違うため、どの列を何として使うかを画面で確認・調整できるようにするためです。
# try-except で囲み、エラーが起きても画面が真っ白にならず、
# 「何が原因か」が日本語で表示されるようにしています。
if uploaded is not None:
    # 同じファイルを読み直すたびに設定がリセットされないよう、ファイル名で覚えておきます。
    if st.session_state.get("raw_name") != uploaded.name:
        try:
            st.session_state["raw"] = data_loader.read_csv_file(uploaded)
            st.session_state["raw_name"] = uploaded.name
            st.session_state.pop("data", None)   # 前のデータは破棄
        except data_loader.DataValidationError as e:
            st.sidebar.error(f"読み込めませんでした\n\n{e}")
        except Exception as e:
            st.sidebar.error(f"予期しないエラーが発生しました: {e}")

elif use_sample:
    try:
        st.session_state["data"] = data_loader.load_sample_data()
        st.session_state["source_name"] = "sample_data/sample.csv（サンプル）"
        st.session_state.pop("raw", None)        # 列対応のUIは不要なので消す
        st.session_state.pop("raw_name", None)
    except Exception as e:
        st.sidebar.error(f"サンプルデータを読み込めませんでした: {e}")


# ============================================================
# 1b. 列の対応づけ（アップロードされたCSV専用）
#
# 実際の証券会社のCSVは列名がまちまち（「終値」が「引値」、「出来高」が「売買高」など）です。
# まず自動で推測し、当たらなかった項目だけ画面で選んでもらう方針にしています。
# ============================================================
raw = st.session_state.get("raw")

if raw is not None:
    guessed = data_loader.guess_column_map(raw.columns)
    # 銘柄名は無くても計算できるので、足りているかの判定からは外します。
    unresolved = [c for c in data_loader.ESSENTIAL_COLUMNS if not guessed.get(c)]
    auto_ok = len(unresolved) == 0

    # 自動で全部当たっていて、まだ読み込んでいないなら、そのまま読み込んでしまいます。
    if auto_ok and "data" not in st.session_state:
        try:
            st.session_state["data"] = data_loader.clean_dataframe(raw, column_map=guessed)
            st.session_state["source_name"] = st.session_state["raw_name"]
        except data_loader.DataValidationError as e:
            st.error(f"読み込めませんでした\n\n{e}")

    title = ("列の対応（自動で判別できました。変更したい場合は開いてください）" if auto_ok
             else "⚠ 列の対応を指定してください（自動で判別できない項目があります）")

    with st.expander(title, expanded=not auto_ok):
        st.caption("アップロードされたファイルの先頭5行")
        st.dataframe(raw.head(), width="stretch")

        st.markdown("**どの列をどの項目として使うか**")
        options = ["（なし）"] + list(raw.columns)
        column_map, fixed_values = {}, {}

        # 項目を2列に分けて表示（縦に長くなりすぎないように）
        left, right = st.columns(2)
        for i, target in enumerate(data_loader.REQUIRED_COLUMNS):
            box = left if i % 2 == 0 else right
            default = guessed.get(target)
            index = options.index(default) if default in options else 0
            choice = box.selectbox(target, options, index=index, key=f"map_{target}")
            column_map[target] = None if choice == "（なし）" else choice

        # 銘柄コード・銘柄名の列が無いCSV（1銘柄だけのファイル）向けの手入力欄
        if column_map["銘柄コード"] is None:
            st.info(
                "銘柄コードの列が見つかりません。"
                "1銘柄だけのファイルの場合は、下に直接入力してください。"
            )
            c1, c2 = st.columns(2)
            fixed_values["銘柄コード"] = c1.text_input("銘柄コード（手入力）", key="fix_code")
            fixed_values["銘柄名"] = c2.text_input("銘柄名（手入力・省略可）", key="fix_name")

        if st.button("この対応で読み込む", type="primary"):
            try:
                st.session_state["data"] = data_loader.clean_dataframe(
                    raw, column_map=column_map, fixed_values=fixed_values
                )
                st.session_state["source_name"] = st.session_state["raw_name"]
                st.success("読み込みました。")
            except data_loader.DataValidationError as e:
                st.error(f"読み込めませんでした\n\n{e}")
            except Exception as e:
                st.error(f"予期しないエラーが発生しました: {e}")

data = st.session_state.get("data")

# データがまだ無いときは、案内だけ出して処理を止めます。
# st.stop() は「ここで実行を打ち切る」命令。以降のコードはエラーになりません。
if data is None:
    # アップロード済みで、列の対応待ちなのか。それともまだ何も無いのかで案内を変えます。
    if raw is not None:
        st.info(
            "上の **「列の対応」** で、どの列をどの項目として使うかを指定し、"
            "**「この対応で読み込む」** を押してください。"
        )
    else:
        st.info(
            "左のサイドバーから CSV をアップロードするか、"
            "**「サンプルデータを使う」** ボタンを押してください。"
        )
    st.caption(
        "列名は「終値」が「引値」、「出来高」が「売買高」のように違っていても、"
        "自動で対応付けます。判別できない場合は画面で指定できます。"
    )
    st.subheader("CSVの必要な項目")
    st.dataframe(
        pd.DataFrame(
            {
                "列名": data_loader.REQUIRED_COLUMNS,
                "内容": ["証券コード", "銘柄の名称（無い場合はコードで代用）",
                        "対象日（2026-08-21 / 2026/8/21 / 20260821 など）",
                        "その日の最初の値段", "その日の最高値", "その日の最安値",
                        "その日の最後の値段", "売買された株数"],
                "よくある別名": ["コード, 証券コード, Code", "名称, 銘柄, Name",
                            "年月日, 取引日, Date", "寄付, 寄値, Open", "高, High",
                            "安, Low", "引値, 大引, Close", "売買高, Volume"],
            }
        ),
        hide_index=True,
        width="stretch",
    )
    st.stop()

# 除外された行があれば知らせます(データの不備に気づけるように)
dropped = data.attrs.get("dropped_rows", 0)
if dropped:
    st.sidebar.warning(f"数値や日付として読めない {dropped} 行を除外しました。")

st.sidebar.success(
    f"読み込み済み: {st.session_state.get('source_name', '')}\n\n"
    f"{data['銘柄コード'].nunique()} 銘柄 / {len(data)} 行"
)


# ============================================================
# 2. しきい値の設定(サイドバー)
#    初期値は screening.DEFAULTS から取っているので、
#    しきい値を変えたいときは screening.py を直せば画面にも反映されます。
# ============================================================
D = screening.DEFAULTS

st.sidebar.header("2. 独自条件（レンジ回帰型）")
st.sidebar.caption("★このツールの主役の条件です")

rr_range_min = st.sidebar.slider(
    "値幅率のしきい値（この値以上）", 0.0, 0.15, D["rr_range_min"], 0.005,
    format="%.3f",
    help="(高値 − 安値) ÷ 始値。大きいほど『よく動いた日』",
)
rr_body_max = st.sidebar.slider(
    "実体比率のしきい値（この値以下）", 0.0, 0.05, D["rr_body_max"], 0.001,
    format="%.3f",
    help="|始値 − 終値| ÷ 始値。小さいほど『始値と終値が近い日』",
)
rr_days = st.sidebar.slider("判定対象の日数 N", 3, 40, D["rr_days"], 1)
rr_ratio_min = st.sidebar.slider(
    "条件を満たす日の割合しきい値", 0.0, 1.0, D["rr_ratio_min"], 0.05,
    help="直近N日のうち、該当日がこの割合以上ある銘柄を『クリア』とします",
)

# スコアの数え方。単純な割合だと「並び順」の情報が捨てられてしまうため、
# 直近の日を重く数える方式を初期値にしています(詳しくは screening.calc_weighted_ratio)。
rr_score_mode = st.sidebar.radio(
    "独自スコアの数え方",
    options=["weighted", "ratio"],
    format_func=lambda x: "直近重視（直近の日ほど重く数える）" if x == "weighted" else "単純割合（要件書どおり）",
    index=0 if D["rr_score_mode"] == "weighted" else 1,
    help="『前半だけ該当』と『直近が該当』を区別したいときは直近重視を選びます",
)

# 終値レンジ幅の条件。1日ごとの形だけを見ると、毎日行って来いなのに
# 日をまたいで切り上がっていく“階段状のトレンド銘柄”を拾ってしまうため、
# 期間全体の値動きの幅もあわせて確認します。
rr_use_band = st.sidebar.checkbox(
    "終値レンジ幅の条件を使う", value=D["rr_use_band"],
    help="オフにすると、階段状に上がり続ける銘柄も候補に含まれます",
)
rr_band_max = st.sidebar.slider(
    "終値レンジ幅の上限", 0.01, 0.50, D["rr_band_max"], 0.01, format="%.2f",
    disabled=not rr_use_band,
    help="(直近N日の最高終値 − 最安終値) ÷ 平均終値。これを超えたらトレンドとみなしてスコアを0にします",
)

st.sidebar.header("3. 標準条件")
turnover_min_oku = st.sidebar.slider(
    "売買代金の下限（億円）", 0, 100, int(D["turnover_min"] / 1e8), 1,
    help="終値 × 出来高。小さいと売りたいときに売れないリスクがあります",
)
volume_spike_min = st.sidebar.slider(
    "出来高急増率の下限（倍）", 1.0, 10.0, D["volume_spike_min"], 0.1,
    help="当日出来高 ÷ 過去5日平均出来高",
)
range_rate_min = st.sidebar.slider(
    "日中値幅率の下限", 0.0, 0.15, D["range_rate_min"], 0.005, format="%.3f",
    help="(高値 − 安値) ÷ 前日終値 ※独自条件とは分母が違います",
)
gap_rate_min = st.sidebar.slider(
    "ギャップ率の下限（絶対値）", 0.0, 0.10, D["gap_rate_min"], 0.005, format="%.3f",
    help="(始値 − 前日終値) ÷ 前日終値。上下どちらでも大きく跳べばOK",
)

# 売買代金は「減点」ではなく「足切り」にします。
# 減点だと、実際には売買が成立しにくい銘柄が上位に残ってしまうためです。
liquidity_filter = st.sidebar.checkbox(
    "売買代金が下限未満の銘柄を一覧から除外する", value=D["liquidity_filter"],
    help="オフにすると、除外せず減点のみで扱います",
)

st.sidebar.header("4. 総合スコアの重み")
weight_standard = st.sidebar.slider("標準条件の重み", 0.0, 1.0, scoring.DEFAULT_WEIGHT_STANDARD, 0.1)
weight_unique = st.sidebar.slider("独自条件の重み", 0.0, 1.0, scoring.DEFAULT_WEIGHT_UNIQUE, 0.1)

# スライダーの値をまとめて1つの辞書にします。
# こうしておくと、計算側(scoring.build_ranking)に渡すのが1行で済みます。
params = {
    "turnover_min": turnover_min_oku * 1e8,   # 億円 → 円に換算
    "volume_spike_min": volume_spike_min,
    "range_rate_min": range_rate_min,
    "gap_rate_min": gap_rate_min,
    "volume_lookback": D["volume_lookback"],
    "rr_range_min": rr_range_min,
    "rr_body_max": rr_body_max,
    "rr_days": rr_days,
    "rr_ratio_min": rr_ratio_min,
    "rr_band_max": rr_band_max,
    "rr_use_band": rr_use_band,
    "rr_score_mode": rr_score_mode,
    "liquidity_filter": liquidity_filter,
    "weight_standard": weight_standard,
    "weight_unique": weight_unique,
}


# ============================================================
# 3. 計算の実行
# ============================================================
try:
    ranking, flagged, enriched, excluded = scoring.build_ranking(data, params)
except Exception as e:
    st.error(f"計算中にエラーが発生しました: {e}")
    st.stop()


# ============================================================
# 4. 一覧表の表示
# ============================================================
st.header("スクリーニング結果")

col1, col2, col3 = st.columns(3)
col1.metric("対象銘柄数", f"{len(ranking)} 銘柄")
col2.metric("独自条件クリア", f"{int(ranking['独自条件クリア'].sum())} 銘柄")
col3.metric("標準条件すべてクリア", f"{int((ranking['標準条件充足数'] == 5).sum())} 銘柄")

# 足切りで除外した銘柄は、隠したままにせず理由とあわせて確認できるようにします。
if not excluded.empty:
    with st.expander(f"売買代金の下限に届かず除外した銘柄：{len(excluded)} 銘柄"):
        show = excluded.copy()
        show["売買代金(億円)"] = (show["売買代金"] / 1e8).round(2)
        st.dataframe(
            show[["銘柄コード", "銘柄名", "売買代金(億円)", "独自スコア", "連続該当日数"]],
            hide_index=True, width="stretch",
        )
        st.caption(
            "独自スコアが高くても、売買代金が小さい銘柄は実際には売買が成立しにくいため除外しています。"
            "サイドバーのチェックを外すと一覧に戻せます。"
        )

only_unique = st.checkbox("独自条件をクリアした銘柄だけ表示する", value=False)
view = ranking[ranking["独自条件クリア"]] if only_unique else ranking

if view.empty:
    st.warning("条件に合う銘柄がありません。サイドバーのしきい値を緩めてみてください。")
else:
    # 表示用にコピーし、○×を見やすい記号に変換します(計算結果そのものは変えません)。
    display = view.copy()
    for col in ["売買代金OK", "出来高急増OK", "値幅OK", "ギャップOK", "移動平均OK", "独自条件クリア"]:
        display[col] = display[col].map({True: "✓", False: "−"})

    display["売買代金(億円)"] = (display["売買代金"] / 1e8).round(1)
    display["連続"] = display["連続該当日数"].astype(int).map(lambda d: f"{d}日" if d else "−")

    # Streamlit の書式 "%.2f%%" は、値をそのまま表示して末尾に % を足すだけです。
    # 0.045(=4.5%)をそのまま渡すと「0.05%」と表示されてしまうため、
    # 表示用にあらかじめ100倍した列を用意します。
    for src, dst in [("日中値幅率", "日中値幅率(%)"), ("ギャップ率", "ギャップ率(%)"),
                     ("終値レンジ幅", "終値レンジ幅(%)")]:
        display[dst] = display[src] * 100
    display["独自条件 該当"] = display.apply(
        lambda r: f"{int(r['該当日数'])}/{int(r['判定日数'])} 日", axis=1
    )

    st.dataframe(
        display[[
            "順位", "銘柄コード", "銘柄名", "総合スコア", "独自スコア", "独自条件 該当",
            "連続", "終値レンジ幅(%)", "除外理由", "独自条件クリア", "標準スコア",
            "売買代金OK", "出来高急増OK", "値幅OK", "ギャップOK", "移動平均OK",
            "売買代金(億円)", "出来高急増率", "日中値幅率(%)", "ギャップ率(%)", "MAクロス",
        ]],
        hide_index=True,
        width="stretch",
        column_config={
            # ProgressColumn はスコアを棒グラフ風に表示してくれる機能です。
            "総合スコア": st.column_config.ProgressColumn(
                "総合スコア", min_value=0, max_value=1, format="%.2f"
            ),
            "独自スコア": st.column_config.ProgressColumn(
                "独自スコア", min_value=0, max_value=1, format="%.2f"
            ),
            "標準スコア": st.column_config.NumberColumn("標準スコア", format="%.2f"),
            "終値レンジ幅(%)": st.column_config.NumberColumn("終値レンジ幅", format="%.1f%%"),
            "連続": st.column_config.TextColumn("連続", help="最新日から数えて何日連続で該当しているか"),
            "除外理由": st.column_config.TextColumn("除外理由", help="独自スコアが0になった理由"),
            "出来高急増率": st.column_config.NumberColumn("出来高急増率", format="%.2f 倍"),
            "日中値幅率(%)": st.column_config.NumberColumn("日中値幅率", format="%.2f%%"),
            "ギャップ率(%)": st.column_config.NumberColumn("ギャップ率", format="%.2f%%"),
        },
    )
    st.caption(
        "✓ = 条件を満たす / − = 満たさない　"
        "「連続」= 最新日から何日連続で該当しているか。"
        "「除外理由」が入っている銘柄は、日々の形は条件を満たしていても"
        "期間全体では値動きが片方向に偏っているため、独自スコアを0にしています。"
        "※「日中値幅率」「ギャップ率」は前日終値を基準にした標準条件の値です。"
    )


# ============================================================
# 5. 銘柄詳細(チャート + 独自条件の判定履歴)
# ============================================================
st.header("銘柄詳細")

# 選択肢は「コード: 銘柄名」の形にして、同名銘柄があっても区別できるようにします。
# 足切りで除外した銘柄も、中身を確認できるよう選択肢には残します。
selectable = pd.concat([ranking, excluded], ignore_index=True) if not excluded.empty else ranking
options = [f"{r['銘柄コード']}: {r['銘柄名']}" for _, r in selectable.iterrows()]
selected = st.selectbox("銘柄を選ぶ（一覧の上位から順に並んでいます）", options)
selected_code = selected.split(":")[0]

# 選ばれた銘柄の全日データを取り出し、日付順に並べます。
detail = flagged[flagged["銘柄コード"] == selected_code].sort_values("日付").copy()
# 移動平均は enriched 側にあるので、必要な列だけ日付をキーに結合します。
ma_cols = enriched[enriched["銘柄コード"] == selected_code][["日付", "MA5", "MA25"]]
detail = detail.merge(ma_cols, on="日付", how="left")

# 判定対象(直近N日)の範囲を示すため、その開始日を控えておきます。
judge_start = detail["日付"].iloc[-rr_days] if len(detail) >= rr_days else detail["日付"].iloc[0]

# --- ローソク足チャート ---
fig = go.Figure()

fig.add_trace(go.Candlestick(
    x=detail["日付"],
    open=detail["始値"], high=detail["高値"], low=detail["安値"], close=detail["終値"],
    name="日足",
    increasing_line_color="#d1495b",   # 日本式:陽線(終値>始値)を赤
    decreasing_line_color="#0f7173",   # 陰線を青緑
))

fig.add_trace(go.Scatter(
    x=detail["日付"], y=detail["MA5"], name="5日移動平均",
    line=dict(color="#f6a800", width=1.5),
))
fig.add_trace(go.Scatter(
    x=detail["日付"], y=detail["MA25"], name="25日移動平均",
    line=dict(color="#8a8a8a", width=1.5, dash="dot"),
))

# 独自条件の「該当日」に印を付けます。
# 高値の少し上に▼を置くことで、ローソク足を隠さずにハイライトできます。
hit_days = detail[detail["該当日"]]
if not hit_days.empty:
    fig.add_trace(go.Scatter(
        x=hit_days["日付"],
        y=hit_days["高値"] * 1.012,
        mode="markers",
        marker=dict(symbol="triangle-down", size=11, color="#7b2cbf"),
        name="独自条件の該当日",
    ))

# 判定対象期間(直近N日)を薄く塗って、どこを見ているか分かるようにします。
fig.add_vrect(
    x0=judge_start, x1=detail["日付"].iloc[-1],
    fillcolor="#7b2cbf", opacity=0.07, line_width=0,
    annotation_text=f"判定対象 直近{rr_days}日", annotation_position="top left",
)

fig.update_layout(
    height=520,
    margin=dict(l=10, r=10, t=30, b=10),
    xaxis_rangeslider_visible=False,  # 下部のミニチャートは不要なので消します
    legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
)
st.plotly_chart(fig, width="stretch")

# --- 判定履歴の表 ---
st.subheader(f"独自条件の判定履歴（直近 {rr_days} 日）")
st.caption(
    f"判定条件: 値幅率 ≧ {rr_range_min:.1%} かつ 実体比率 ≦ {rr_body_max:.1%}"
)

history = detail.tail(rr_days).copy()
history["日付"] = history["日付"].dt.strftime("%Y-%m-%d")
history["判定"] = history["該当日"].map({True: "✓ 該当", False: "−"})
# 一覧表と同じ理由で、%表示する列はあらかじめ100倍しておきます
history["値幅率(%)"] = history["値幅率(始値基準)"] * 100
history["実体比率(%)"] = history["実体比率"] * 100

st.dataframe(
    history[["日付", "始値", "高値", "安値", "終値", "値幅率(%)", "実体比率(%)", "判定"]],
    hide_index=True,
    width="stretch",
    column_config={
        "値幅率(%)": st.column_config.NumberColumn("値幅率(始値基準)", format="%.2f%%"),
        "実体比率(%)": st.column_config.NumberColumn("実体比率", format="%.2f%%"),
    },
)

# 一覧表から、この銘柄の集計結果をそのまま持ってきて表示します
# (画面上の説明と一覧の数字が食い違わないよう、再計算はしません)。
row = selectable[selectable["銘柄コード"] == selected_code].iloc[0]
hit_count = int(row["該当日数"])

message = (
    f"**{selected}** ： 直近 {int(row['判定日数'])} 日のうち **{hit_count} 日** が該当"
    f"（単純割合 {row['該当割合']:.2f} / 直近重視 {row['直近重視割合']:.2f}、"
    f"連続 {int(row['連続該当日数'])} 日）　"
    f"終値レンジ幅 {row['終値レンジ幅']:.1%}"
    f"　→ 独自スコア **{row['独自スコア']:.2f}**（クリア基準 {rr_ratio_min:.0%}）"
)
if row["除外理由"]:
    st.warning(message + f"\n\n⚠ {row['除外理由']} のため、独自スコアを0にしています。"
                         "日々は行って来いの形でも、期間全体では値動きが片方向に偏っている銘柄です。")
else:
    st.info(message)
