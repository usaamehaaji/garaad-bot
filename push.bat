@echo off
echo.
echo  Garaad Bot - GitHub Push
echo  ========================
echo.

git add .

set /p msg=Commit message (ama Enter ku dhufo "update"):
if "%msg%"=="" set msg=update

git commit -m "%msg%"
git push origin main

echo.
echo  Done! Endercloud restart ka dib code cusub ayuu isticmaalayaa.
echo.
pause
