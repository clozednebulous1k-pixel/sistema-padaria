@echo off
title Atualizando Sistema Padaria
cd /d "%~dp0"

echo ========================================
echo   Atualizando Sistema Padaria Belfort
echo ========================================
echo.

:: Encerrar processos antigos (API e Front)
echo Encerrando processos antigos...
taskkill /FI "WINDOWTITLE eq API Padaria*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Front Padaria*" /F 2>nul
timeout /t 2 /nobreak > nul

:: Atualizar dependências (opcional - descomente se precisar)
:: echo Instalando dependencias da API...
:: cd API && npm install && cd ..
:: echo Instalando dependencias do Front...
:: cd Front && npm install && cd ..

:: Reiniciar API
echo Iniciando API...
start "API Padaria" cmd /k "cd /d %~dp0API && npm run dev"
timeout /t 5 /nobreak > nul

:: Reiniciar Front
echo Iniciando Front...
start "Front Padaria" cmd /k "cd /d %~dp0Front && npm run dev -- -H 0.0.0.0"

echo.
echo Sistema atualizado e reiniciado!
echo API: http://localhost:3503
echo Front: http://localhost:3000 ou http://192.168.0.126:3000
echo.
pause
