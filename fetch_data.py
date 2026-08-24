"""
fetch_data.py : 株価データを自動で取得して、このツールが読めるCSVを作るスクリプト。

■ このスクリプトの役割
    銘柄コードのリストを渡すと、インターネットから日足データを取ってきて、
    app.py がそのまま読み込める形のCSVファイルを1つ作ります。
    毎回サイトから手作業でダウンロードする必要がなくなります。

■ 使い方（コマンドプロンプト／ターミナルで）

    1) 最初の1回だけ、取得用の部品を入れる
         python -m pip install yfinance

    2) 実行する（内蔵の主要銘柄リストで、過去90日分を取得）
         python fetch_data.py

    3) 銘柄や期間を指定したいとき
         python fetch_data.py --codes 7203,6758,9984 --days 120
         python fetch_data.py --file mycodes.txt

    出来上がったCSVは data フォルダに保存されます。
    そのファイルを app.py の画面からアップロードしてください。

■ データの入手元について
    Yahoo Finance の公開データを、yfinance という部品を通して取得しています。
    証券会社の口座やAPIキーは不要です。
    ただし公式に保証されたサービスではないため、将来仕様が変わる可能性はあります。
    フェーズ2で証券会社のAPIに切り替えるときは、このファイルを差し替えるだけで済むよう、
    出力するCSVの形は data_loader.py が求める形に固定してあります。
"""

import argparse
import os
import sys
import time
from datetime import datetime

import pandas as pd

# ------------------------------------------------------------
# 内蔵の銘柄リスト（東証の売買代金が大きい主要銘柄）
#
# ここに書いてある銘柄名は「画面に表示するためのラベル」です。
# 社名変更などで実際と食い違うことがありますが、判定結果には影響しません
# （計算に使うのは価格と出来高だけです）。
# 自分の見たい銘柄に入れ替えて構いません。
# ------------------------------------------------------------
DEFAULT_CODES = {
    "1605": "INPEX",            "1721": "コムシスホールディングス", "1801": "大成建設",
    "1802": "大林組",            "1925": "大和ハウス工業",       "1928": "積水ハウス",
    "2269": "明治ホールディングス", "2413": "エムスリー",          "2502": "アサヒグループHD",
    "2503": "キリンホールディングス", "2801": "キッコーマン",        "2802": "味の素",
    "2914": "日本たばこ産業",     "3382": "セブン&アイHD",       "3402": "東レ",
    "3405": "クラレ",            "3407": "旭化成",              "3659": "ネクソン",
    "4004": "レゾナック・ホールディングス", "4005": "住友化学",     "4063": "信越化学工業",
    "4188": "三菱ケミカルグループ", "4307": "野村総合研究所",       "4324": "電通グループ",
    "4452": "花王",              "4502": "武田薬品工業",         "4503": "アステラス製薬",
    "4506": "住友ファーマ",       "4519": "中外製薬",            "4523": "エーザイ",
    "4543": "テルモ",            "4568": "第一三共",            "4578": "大塚ホールディングス",
    "4661": "オリエンタルランド",  "4689": "LINEヤフー",          "4755": "楽天グループ",
    "4901": "富士フイルムHD",     "5019": "出光興産",            "5020": "ENEOSホールディングス",
    "5108": "ブリヂストン",       "5401": "日本製鉄",            "5406": "神戸製鋼所",
    "5411": "JFEホールディングス", "5713": "住友金属鉱山",         "5802": "住友電気工業",
    "6098": "リクルートホールディングス", "6146": "ディスコ",       "6273": "SMC",
    "6301": "コマツ",            "6326": "クボタ",              "6367": "ダイキン工業",
    "6501": "日立製作所",         "6503": "三菱電機",            "6594": "ニデック",
    "6645": "オムロン",          "6701": "NEC",                "6702": "富士通",
    "6752": "パナソニックHD",     "6758": "ソニーグループ",       "6762": "TDK",
    "6857": "アドバンテスト",     "6861": "キーエンス",           "6902": "デンソー",
    "6920": "レーザーテック",     "6954": "ファナック",           "6971": "京セラ",
    "6981": "村田製作所",         "7011": "三菱重工業",           "7201": "日産自動車",
    "7203": "トヨタ自動車",       "7267": "ホンダ",              "7269": "スズキ",
    "7270": "SUBARU",           "7735": "SCREENホールディングス", "7741": "HOYA",
    "7751": "キヤノン",          "7832": "バンダイナムコHD",      "7974": "任天堂",
    "8001": "伊藤忠商事",         "8002": "丸紅",                "8031": "三井物産",
    "8035": "東京エレクトロン",   "8053": "住友商事",             "8058": "三菱商事",
    "8267": "イオン",            "8306": "三菱UFJフィナンシャルG", "8316": "三井住友フィナンシャルG",
    "8411": "みずほフィナンシャルG", "8591": "オリックス",          "8630": "SOMPOホールディングス",
    "8725": "MS&ADインシュアランスG", "8766": "東京海上ホールディングス", "8801": "三井不動産",
    "8802": "三菱地所",          "9020": "東日本旅客鉄道",        "9022": "東海旅客鉄道",
    "9101": "日本郵船",          "9104": "商船三井",             "9432": "日本電信電話",
    "9433": "KDDI",             "9434": "ソフトバンク",          "9501": "東京電力HD",
    "9502": "中部電力",          "9503": "関西電力",             "9613": "NTTデータグループ",
    "9735": "セコム",            "9843": "ニトリホールディングス",  "9983": "ファーストリテイリング",
    "9984": "ソフトバンクグループ",
}

# app.py が読み込むCSVの列（この順番・この名前で出力します）
OUTPUT_COLUMNS = ["銘柄コード", "銘柄名", "日付", "始値", "高値", "安値", "終値", "出来高"]


def read_codes_from_file(path):
    """
    銘柄コードを書いたテキストファイルを読む。

    1行に1銘柄。銘柄名は省略できます。
        7203,トヨタ自動車
        6758,ソニーグループ
        9984

    「#」で始まる行は、メモとして無視します。
    """
    codes = {}
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.replace("\t", ",").split(",")]
            code = parts[0]
            name = parts[1] if len(parts) > 1 and parts[1] else DEFAULT_CODES.get(code, code)
            codes[code] = name
    if not codes:
        raise ValueError(f"銘柄コードが1つも読み取れませんでした: {path}")
    return codes


def to_tool_format(raw, codes):
    """
    取得した生データを、このツールが読めるCSVの形に整える。

    ■ なぜ関数を分けているか
        ここは「表の形を組み替えるだけ」の処理で、インターネット接続が要りません。
        取得部分と分けておくことで、通信できない環境でも動作を確認できます。

    引数:
        raw   : yfinance が返す表。銘柄が複数のときは列が2段（銘柄, 項目）になっています。
        codes : {"7203": "トヨタ自動車", ...} という銘柄コードと名前の対応

    戻り値: 銘柄コード/銘柄名/日付/始値/高値/安値/終値/出来高 の8列の表
    """
    frames = []

    for code, name in codes.items():
        ticker = f"{code}.T"       # 日本株はコードの後ろに .T を付けて指定します

        # 列が2段になっている場合（銘柄が複数のとき）は、その銘柄の部分だけを取り出します。
        if isinstance(raw.columns, pd.MultiIndex):
            if ticker not in raw.columns.get_level_values(0):
                continue           # 取得できなかった銘柄は飛ばす
            one = raw[ticker].copy()
        else:
            one = raw.copy()       # 銘柄が1つだけのときは、そのまま使えます

        # 必要な列が揃っているか確認（Yahoo側の仕様変更に備えたチェック）
        needed = ["Open", "High", "Low", "Close", "Volume"]
        if not all(c in one.columns for c in needed):
            continue

        one = one[needed].dropna()
        if one.empty:
            continue

        frames.append(pd.DataFrame({
            "銘柄コード": code,
            "銘柄名": name,
            # index（行の見出し）に日付が入っているので、列として取り出します
            "日付": pd.to_datetime(one.index).strftime("%Y-%m-%d"),
            "始値": one["Open"].round(1).values,
            "高値": one["High"].round(1).values,
            "安値": one["Low"].round(1).values,
            "終値": one["Close"].round(1).values,
            # 出来高は株数なので整数にします
            "出来高": one["Volume"].fillna(0).astype("int64").values,
        }))

    if not frames:
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    result = pd.concat(frames, ignore_index=True)
    return result[OUTPUT_COLUMNS].sort_values(["銘柄コード", "日付"]).reset_index(drop=True)


def download_prices(codes, days, chunk_size=20, wait=1.0):
    """
    インターネットから株価を取得する（ここだけが通信を行う部分）。

    引数:
        codes      : 銘柄コードと名前の対応
        days       : 何日分さかのぼるか（カレンダー上の日数）
        chunk_size : 一度に何銘柄ずつ取得するか。
                     一気に大量に頼むと相手のサーバーに負担がかかり、
                     エラーで弾かれることがあるので、小分けにしています。
        wait       : 小分けにした取得の間に空ける秒数（同上の理由）
    """
    try:
        import yfinance as yf
    except ImportError:
        print("\n[エラー] 取得用の部品 yfinance が入っていません。")
        print("次の1行を実行してから、もう一度お試しください:")
        print("\n    python -m pip install yfinance\n")
        sys.exit(1)

    tickers = [f"{c}.T" for c in codes]
    chunks = [tickers[i:i + chunk_size] for i in range(0, len(tickers), chunk_size)]

    parts = []
    for i, chunk in enumerate(chunks, start=1):
        print(f"  取得中... ({i}/{len(chunks)} 組, {len(chunk)}銘柄)")
        try:
            data = yf.download(
                chunk,
                period=f"{days}d",
                interval="1d",
                group_by="ticker",     # 列を「銘柄ごと」にまとめてもらう
                auto_adjust=False,     # 実際に取引された値段のまま受け取る
                progress=False,
                threads=True,
            )
            if data is not None and not data.empty:
                parts.append(data)
        except Exception as e:
            # 1組が失敗しても全体を止めず、残りの取得を続けます。
            print(f"  [警告] この組の取得に失敗しました: {e}")

        if i < len(chunks):
            time.sleep(wait)

    if not parts:
        return None

    # 組ごとの表を横につなげます（日付を軸に揃える）
    return pd.concat(parts, axis=1) if len(parts) > 1 else parts[0]


def main():
    parser = argparse.ArgumentParser(
        description="株価を取得して、スクリーニングツール用のCSVを作ります。"
    )
    parser.add_argument("--codes", help="銘柄コードをカンマ区切りで指定 (例: 7203,6758,9984)")
    parser.add_argument("--file", help="銘柄コードを書いたテキストファイルの場所")
    parser.add_argument("--days", type=int, default=90,
                        help="何日分さかのぼるか（既定: 90）。判定に使うのは営業日だけなので、"
                             "40営業日ぶん確保するには60日以上を指定してください")
    parser.add_argument("--out", help="出力するCSVの場所（既定: data/stocks_日付.csv）")
    args = parser.parse_args()

    # --- 対象銘柄を決める ---
    if args.file:
        codes = read_codes_from_file(args.file)
        source = f"ファイル {args.file}"
    elif args.codes:
        codes = {}
        for c in args.codes.split(","):
            c = c.strip()
            if c:
                codes[c] = DEFAULT_CODES.get(c, c)
        source = "コマンドで指定された銘柄"
    else:
        codes = DEFAULT_CODES
        source = "内蔵の主要銘柄リスト"

    print("=" * 56)
    print(" 株価データの取得")
    print("=" * 56)
    print(f"  対象  : {source}（{len(codes)}銘柄）")
    print(f"  期間  : 直近 {args.days} 日\n")

    raw = download_prices(codes, args.days)
    if raw is None or raw.empty:
        print("\n[エラー] データを1件も取得できませんでした。")
        print("  ・インターネットに接続されているか確認してください")
        print("  ・銘柄コードが正しいか確認してください（日本株は4桁の数字です）")
        print("  ・時間をおいて、もう一度お試しください")
        sys.exit(1)

    print("\n  取得したデータを、ツールが読める形に変換しています...")
    df = to_tool_format(raw, codes)

    if df.empty:
        print("\n[エラー] 変換できるデータがありませんでした。銘柄コードをご確認ください。")
        sys.exit(1)

    # --- 保存 ---
    out_path = args.out
    if not out_path:
        out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"stocks_{datetime.now():%Y%m%d}.csv")

    # encoding="utf-8-sig" は、Excelで開いても日本語が文字化けしない形式です。
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    # --- 結果の報告 ---
    got = set(df["銘柄コード"])
    missing = [c for c in codes if c not in got]
    per_stock = df.groupby("銘柄コード").size()

    print("\n" + "=" * 56)
    print(" 完了")
    print("=" * 56)
    print(f"  取得できた銘柄 : {len(got)} / {len(codes)}")
    print(f"  期間           : {df['日付'].min()} 〜 {df['日付'].max()}")
    print(f"  1銘柄あたり    : 約 {int(per_stock.median())} 日分")
    print(f"  総行数         : {len(df)}")
    print(f"  保存先         : {out_path}")

    if missing:
        print(f"\n  取得できなかった銘柄（{len(missing)}件）: {', '.join(missing[:15])}"
              + (" ..." if len(missing) > 15 else ""))
        print("  上場廃止・社名変更・コード違いの可能性があります。")

    if int(per_stock.median()) < 25:
        print("\n  [注意] 1銘柄あたりの日数が少なめです。")
        print("  25日移動平均を表示するには、--days をもっと大きく指定してください（例: --days 120）。")

    print("\n  次の手順:")
    print("    1) python -m streamlit run app.py")
    print("    2) 画面左の「CSVファイルをアップロード」から、上の保存先のファイルを選ぶ")
    print()


if __name__ == "__main__":
    main()
