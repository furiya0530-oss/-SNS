@echo off
cd /d "%~dp0"
title 株価データの取得

echo ==================================================
echo   株価データの取得
echo ==================================================
echo.

python --version >nul 2>&1
if errorlevel 1 goto NOPYTHON

REM --- 取得用の部品がなければ入れる ---
python -c "import yfinance" >nul 2>&1
if errorlevel 1 (
    echo [準備] 初回のみ、取得用の部品をインストールします。
    echo.
    python -m pip install yfinance
    if errorlevel 1 goto PIPERROR
    echo.
)

echo [取得] 主要銘柄の株価を取得します。1～2分かかります。
echo.
python fetch_data.py
goto END

:NOPYTHON
echo [エラー] Python が見つかりませんでした。
echo   python.org からインストールし、
echo  「Add python.exe to PATH」にチェックを入れてください。
goto END

:PIPERROR
echo.
echo [エラー] 部品のインストールに失敗しました。
echo   インターネットに接続されているか確認してください。

:END
echo.
pause
