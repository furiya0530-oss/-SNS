@echo off
cd /d "%~dp0"
title デイトレ銘柄スクリーニングツール

echo ==================================================
echo   デイトレ銘柄スクリーニングツール
echo ==================================================
echo.

REM --- Python が入っているか確認 ---
python --version >nul 2>&1
if errorlevel 1 goto NOPYTHON

REM --- 必要な部品がそろっているか確認（そろっていれば飛ばす） ---
python -c "import streamlit, pandas, plotly" >nul 2>&1
if errorlevel 1 (
    echo [準備] 初回のみ、必要な部品をインストールします。
    echo        2～5分ほどかかります。そのままお待ちください。
    echo.
    python -m pip install -r requirements.txt
    if errorlevel 1 goto PIPERROR
    echo.
)

echo [起動] ブラウザが自動で開きます。
echo.
echo   ※ 終了するときは、この黒い画面で Ctrl キーと C キーを同時に押してください。
echo      ブラウザを閉じただけでは終了しません。
echo.
python -m streamlit run app.py
goto END

:NOPYTHON
echo [エラー] Python が見つかりませんでした。
echo.
echo   python.org から Python をインストールしてください。
echo   インストール時に「Add python.exe to PATH」への
echo   チェックを必ず入れてください。
echo.
goto END

:PIPERROR
echo.
echo [エラー] 部品のインストールに失敗しました。
echo   インターネットに接続されているか確認してください。
echo   上に出ている英語のメッセージをそのままコピーして相談してください。
echo.

:END
echo.
pause
