"""
data_loader.py : データを「読み込んで」「整える」係。

■ このファイルの役割
    CSVファイルを読み込み、スクリーニング計算に使える形のきれいな表に整えます。
    逆に言うと、ここでは“計算”は一切しません。計算は screening.py の担当です。

■ なぜ分けているか(重要)
    将来フェーズ2で、データの取得元をCSVから kabuステーションAPI に切り替える予定です。
    そのとき修正するのはこのファイルだけで済むように設計しています。
    このファイルが返す表の“形”(列名・型)さえ守れば、
    screening.py や app.py は一行も直す必要がありません。
    → この考え方を「関心の分離」と呼びます。
"""

import pandas as pd

# ------------------------------------------------------------
# 必須カラム(列)の定義
# 要件定義書 5.1 で決めた「最低限必要な列」です。
# この8つが揃っていないデータは、計算しても意味がないので受け付けません。
# ------------------------------------------------------------
REQUIRED_COLUMNS = ["銘柄コード", "銘柄名", "日付", "始値", "高値", "安値", "終値", "出来高"]

# 数値として扱う列(文字列のままだと足し算・割り算ができないため)
NUMERIC_COLUMNS = ["始値", "高値", "安値", "終値", "出来高"]


class DataValidationError(Exception):
    """
    データの中身に問題があったときに投げる、このツール専用のエラー。

    ふつうのエラーだと英語のメッセージが出て原因が分かりにくいので、
    「何がダメだったか」を日本語で持たせた専用のエラーを用意しています。
    app.py 側では、このエラーを受け取って画面に赤字で表示します。
    """
    pass


def read_csv_file(source):
    """
    CSVファイルを読み込んで、加工前の“生の表”を返す。

    引数 source は次のどちらでもOKです:
        - ファイルのパス(文字列)         例: "sample_data/sample.csv"
        - Streamlitのアップロード結果     例: st.file_uploader() が返すもの

    ■ 文字コードについて
        日本語CSVは主に UTF-8 と Shift-JIS(Python上の名前は cp932)の2種類があります。
        証券会社からダウンロードしたCSVは Shift-JIS のことが多く、
        UTF-8 だと決め打ちすると「文字化け」や読み込みエラーになります。
        そこで候補を順番に試し、最初に成功したものを採用します。
    """
    encodings = ["utf-8-sig", "cp932", "utf-8"]
    last_error = None

    for encoding in encodings:
        try:
            # アップロードされたファイルは一度読むと“読み終わり位置”が末尾に進んでしまうため、
            # 読み直す前に先頭(0の位置)へ戻します。seek を持たないパス文字列では何もしません。
            if hasattr(source, "seek"):
                source.seek(0)

            df = pd.read_csv(
                source,
                encoding=encoding,
                # 銘柄コードは「0700」のように先頭が0の場合があります。
                # 数値として読むと 700 になって0が消えてしまうため、文字列として読みます。
                dtype={"銘柄コード": str},
            )
            return df

        except UnicodeDecodeError as e:
            # この文字コードでは読めなかっただけなので、次の候補を試します。
            last_error = e
            continue
        except FileNotFoundError:
            raise DataValidationError(f"ファイルが見つかりません: {source}")
        except Exception as e:
            # 区切り文字が違う、ファイルが壊れている等、読み込み自体に失敗したケース
            raise DataValidationError(
                f"CSVの読み込みに失敗しました。ファイルが壊れていないか確認してください。(詳細: {e})"
            )

    raise DataValidationError(
        f"文字コードを判別できませんでした。UTF-8 または Shift-JIS で保存し直してください。(詳細: {last_error})"
    )


def validate_columns(df):
    """
    必須カラムが揃っているかチェックする。

    戻り値: 足りない列名のリスト(すべて揃っていれば空のリスト)
    ※ ここではエラーを投げず「足りないものの一覧」を返すだけにしています。
       エラーにするか警告にするかを、呼び出す側(画面)で決められるようにするためです。
    """
    # 列名の前後に余計な空白が入っていることがあるので、比較の前に取り除きます。
    actual_columns = [str(c).strip() for c in df.columns]
    return [col for col in REQUIRED_COLUMNS if col not in actual_columns]


def clean_dataframe(df):
    """
    読み込んだ生の表を、計算に使える形へ整える(前処理)。

    やっていること:
        1. 列名の前後の空白を除去
        2. 必須カラムのチェック(足りなければエラー)
        3. 日付を「日付型」に変換
        4. 価格・出来高を「数値型」に変換(カンマ区切り "1,234" にも対応)
        5. 計算できない行(欠損=NaN)を除外
        6. 銘柄コード・日付の順に並べ替え

    ※ NaN(ナン)= "Not a Number" の略で、pandas における「空っぽの値」のこと。
      NaN が混ざったまま計算すると結果も NaN になり、原因が分かりにくいバグになります。
      そのため、この段階で取り除いておきます。
    """
    df = df.copy()  # 元の表を書き換えないよう、複製してから加工します
    df.columns = [str(c).strip() for c in df.columns]

    # --- 2. 必須カラムのチェック ---
    missing = validate_columns(df)
    if missing:
        raise DataValidationError(
            "必須カラムが不足しています: " + ", ".join(missing)
            + "\n必要な列: " + ", ".join(REQUIRED_COLUMNS)
        )

    # 余計な列があっても害はありませんが、扱いを単純にするため必須列だけに絞ります。
    df = df[REQUIRED_COLUMNS]

    # --- 3. 日付の変換 ---
    # errors="coerce" は「変換できない値はエラーにせず NaT(空の日付)にする」という指定。
    # 1行の書式ミスで全体が止まるのを避け、あとでまとめて取り除く方針にしています。
    df["日付"] = pd.to_datetime(df["日付"], errors="coerce")

    # --- 4. 数値の変換 ---
    for col in NUMERIC_COLUMNS:
        # "1,234" のようなカンマ入りの数字は、そのままでは数値に変換できないので先に除去します。
        # is_numeric_dtype は「その列がすでに数値型かどうか」を判定する関数です。
        # 数値型でない(=文字列として読み込まれた)ときだけ、カンマと空白を取り除きます。
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].astype(str).str.replace(",", "", regex=False).str.strip()
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["銘柄コード"] = df["銘柄コード"].astype(str).str.strip()
    df["銘柄名"] = df["銘柄名"].astype(str).str.strip()

    # --- 5. 欠損行の除外 ---
    before = len(df)
    df = df.dropna(subset=["銘柄コード", "日付"] + NUMERIC_COLUMNS)
    dropped = before - len(df)

    if len(df) == 0:
        raise DataValidationError(
            "有効なデータが1行もありませんでした。"
            "日付の書式(例: 2026-08-21)や、価格・出来高が数値になっているか確認してください。"
        )

    # --- 6. 並べ替え ---
    # 移動平均や前日終値の計算は「日付順に並んでいること」が大前提なので、ここで必ず整えます。
    df = df.sort_values(["銘柄コード", "日付"]).reset_index(drop=True)

    # 除外した行数を表に付けて持たせ、画面で「◯行除外しました」と知らせられるようにします。
    # (attrs は DataFrame におまけ情報をぶら下げておける置き場所です)
    df.attrs["dropped_rows"] = dropped

    return df


def load_from_csv(source):
    """
    【外から呼ぶのはこの関数】CSVを読み込んで、整えた表を返す。

    read_csv_file(読む) → clean_dataframe(整える) をまとめて実行するだけの関数です。
    app.py はこの1行を呼ぶだけで済みます。
    """
    raw = read_csv_file(source)
    return clean_dataframe(raw)


def load_sample_data(path="sample_data/sample.csv"):
    """動作確認用のサンプルCSVを読み込む(画面の「サンプルデータを使う」ボタン用)。"""
    return load_from_csv(path)


def load_from_api(*args, **kwargs):
    """
    【フェーズ2用の置き場所】kabuステーションAPIから株価を取得する関数(未実装)。

    将来ここを実装し、load_from_csv と“まったく同じ形の表”
    (列: 銘柄コード, 銘柄名, 日付, 始値, 高値, 安値, 終値, 出来高)を返すようにすれば、
    screening.py・scoring.py・app.py は変更せずにリアルタイムデータへ切り替えられます。
    """
    raise NotImplementedError(
        "API連携はフェーズ2で実装予定です。現在はCSV(load_from_csv)をご利用ください。"
    )


# このファイルを直接実行したときだけ動く動作確認用のコード。
# 「python data_loader.py」で、サンプルCSVがきちんと読めるか確かめられます。
if __name__ == "__main__":
    data = load_sample_data()
    print("読み込み成功")
    print(f"  行数      : {len(data)}")
    print(f"  銘柄数    : {data['銘柄コード'].nunique()}")
    print(f"  期間      : {data['日付'].min():%Y-%m-%d} 〜 {data['日付'].max():%Y-%m-%d}")
    print(f"  除外行数  : {data.attrs.get('dropped_rows', 0)}")
    print(data.head())
