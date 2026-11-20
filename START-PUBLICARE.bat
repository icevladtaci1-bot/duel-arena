@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo DUEL ARENA V12 - PUBLICARE SITE + SERVER
where node >nul 2>&1 || (echo Trebuie instalat Node.js de la https://nodejs.org/ & pause & exit /b 1)
echo Se va deschide autentificarea Cloudflare.
call npx --yes wrangler@latest login
if errorlevel 1 (echo Login esuat. & pause & exit /b 1)
call npx --yes wrangler@latest deploy
if errorlevel 1 (echo Publicarea a esuat. & pause & exit /b 1)
echo Copiaza URL-ul cu workers.dev afisat mai sus.
pause
