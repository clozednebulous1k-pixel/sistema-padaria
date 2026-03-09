@echo off
title Criar Banco Padaria Belfort
cd /d "%~dp0API\database"

echo.
echo ========================================
echo Criar banco em 192.168.0.126
echo Usuario: Alessandro
echo Banco: db_padaria_belfort
echo ========================================
echo.

echo [1/2] Criando usuario e banco...
psql -h 192.168.0.126 -U postgres -f 01_criar_usuario_banco.sql
if errorlevel 1 (
    echo ERRO: Verifique se PostgreSQL esta instalado e psql esta no PATH
    echo Ou execute manualmente no pgAdmin: 01_criar_usuario_banco.sql
    pause
    exit /b 1
)

echo.
echo [2/2] Criando tabelas...
psql -h 192.168.0.126 -U postgres -d db_padaria_belfort -f 02_criar_tabelas.sql
if errorlevel 1 (
    echo ERRO ao criar tabelas
    pause
    exit /b 1
)

echo.
echo Banco criado com sucesso!
pause
