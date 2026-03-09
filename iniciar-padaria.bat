@echo off
title Sistema Padaria Belfort
cd /d "%~dp0"

:: Aguardar o Windows terminar de carregar
timeout /t 15 /nobreak > nul

:: Iniciar API em nova janela
start "API Padaria" cmd /k "cd /d %~dp0API && npm run dev"

:: Aguardar a API subir
timeout /t 5 /nobreak > nul

:: Iniciar Front em nova janela (acessível na rede)
start "Front Padaria" cmd /k "cd /d %~dp0Front && npm run dev -- -H 0.0.0.0"

echo Sistema iniciado! API: porta 3503 | Front: porta 3000
echo Acesse: http://localhost:3000 ou http://192.168.0.126:3000
pause
