#!/bin/bash
# Mac用：ダブルクリックで株価データを取得します

cd "$(dirname "$0")" || exit 1

echo "=================================================="
echo "  株価データの取得"
echo "=================================================="
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "[エラー] Python が見つかりませんでした。"
  echo "  python.org から Python をインストールしてください。"
  echo
  read -n 1 -s -r -p "何かキーを押すと閉じます..."
  exit 1
fi

# --- 取得用の部品がなければ入れる ---
if ! python3 -c "import yfinance" >/dev/null 2>&1; then
  echo "[準備] 初回のみ、取得用の部品をインストールします。"
  echo
  if ! python3 -m pip install yfinance; then
    echo
    echo "[エラー] 部品のインストールに失敗しました。"
    echo
    read -n 1 -s -r -p "何かキーを押すと閉じます..."
    exit 1
  fi
  echo
fi

echo "[取得] 主要銘柄の株価を取得します。1〜2分かかります。"
echo
python3 fetch_data.py

echo
read -n 1 -s -r -p "何かキーを押すと閉じます..."
