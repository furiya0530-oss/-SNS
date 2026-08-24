#!/bin/bash
# Mac用：ダブルクリックでツールを起動します
# （初回だけ「開発元を確認できません」と出たら、右クリック →「開く」を選んでください）

cd "$(dirname "$0")" || exit 1

echo "=================================================="
echo "  デイトレ銘柄スクリーニングツール"
echo "=================================================="
echo

# --- Python が入っているか確認 ---
if ! command -v python3 >/dev/null 2>&1; then
  echo "[エラー] Python が見つかりませんでした。"
  echo "  python.org から Python をインストールしてください。"
  echo
  read -n 1 -s -r -p "何かキーを押すと閉じます..."
  exit 1
fi

# --- 必要な部品がそろっているか確認（そろっていれば飛ばす） ---
if ! python3 -c "import streamlit, pandas, plotly" >/dev/null 2>&1; then
  echo "[準備] 初回のみ、必要な部品をインストールします。"
  echo "       2〜5分ほどかかります。そのままお待ちください。"
  echo
  if ! python3 -m pip install -r requirements.txt; then
    echo
    echo "[エラー] 部品のインストールに失敗しました。"
    echo "  インターネットに接続されているか確認してください。"
    echo
    read -n 1 -s -r -p "何かキーを押すと閉じます..."
    exit 1
  fi
  echo
fi

echo "[起動] ブラウザが自動で開きます。"
echo
echo "  ※ 終了するときは、この画面で Control キーと C キーを同時に押してください。"
echo "     ブラウザを閉じただけでは終了しません。"
echo
python3 -m streamlit run app.py
