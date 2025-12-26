@echo off
chcp 65001 > nul
echo ======================================================
echo   梶本クリニック 統合管理システム - 開発用サーバー
echo ======================================================
echo.
echo ブラウザで以下のURLを開いてください:
echo http://localhost:8000
echo.
echo [!] Pythonがインストールされている必要があります。
echo [!] 終了するには、この画面を閉じるか Ctrl+C を押してください。
echo.
python -m http.server 8000
pause
