@echo off
cd /d "%~dp0"

:: Aguardar o Windows terminar de carregar
timeout /t 15 /nobreak > nul

:: Iniciar API em segundo plano (minimizado)
start /min "API Padaria" cmd /c "cd /d %~dp0API && npm run dev"

:: Aguardar a API subir
timeout /t 5 /nobreak > nul

:: Iniciar Front em segundo plano (minimizado)
start /min "Front Padaria" cmd /k "cd /d %~dp0Front && npm run dev -- -H 0.0.0.0"
