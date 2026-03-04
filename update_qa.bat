@echo off
chcp 65001 > nul
echo ===================================================
echo.
echo Q^&Aデータ (qa-data.csv) の更新をシステムに適用しています...
echo.
echo ===================================================
python scripts\update_qa_js.py
echo.
echo 完了しました！ブラウザをリロードしてQ^&A画面を確認してください。
pause
