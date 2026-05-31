@echo off
chcp 65001 >nul 2>&1
title Configurar MiniMax M2.5 Free

cls
echo.
echo ================================================
echo   CONFIGURACAO MINIMAX M2.5 FREE - PASSO A PASSO
echo ================================================
echo.
echo   Siga os passos abaixo:
echo.
echo   1. O navegador vai abrir automaticamente
echo   2. Faca login no OpenRouter
echo   3. Clique em "API Keys" (menu esquerdo)
echo   4. Clique em "Create Key"
echo   5. Digite: opencode
echo   6. Clique em "Create"
echo   7. Copie a chave que aparecer
echo.
echo ================================================
echo.

REM Abrir navegador
start https://openrouter.ai/keys

echo   Aguardando voce criar a chave...
echo.
echo   Quando tiver a chave, cole ela aqui:
echo.

set /p APIKEY="   Chave: "

echo.
echo   Configurando...

REM Criar diretorio
if not exist "%USERPROFILE%\.config\opencode" mkdir "%USERPROFILE%\.config\opencode"

REM Criar JSON
> "%USERPROFILE%\.config\opencode\opencode.json" (
echo {
echo   "$schema": "https://opencode.ai/config.json",
echo   "provider": {
echo     "openrouter": {
echo       "npm": "@ai-sdk/openai-compatible",
echo       "name": "MiniMax M2.5 Free",
echo       "options": {
echo         "baseURL": "https://openrouter.ai/api/v1",
echo         "apiKey": "%APIKEY%"
echo       },
echo       "models": {
echo         "minimax-m2.5-free": {
echo           "name": "minimax/minimax-m2.5:free"
echo         }
echo       }
echo     }
echo   },
echo   "model": "openrouter/minimax/minimax-m2.5:free"
echo }
)

echo.
echo ================================================
echo   PRONTO! Configuracao salva!
echo ================================================
echo.
echo   Para usar:
echo.
echo   1. Abra um terminal NOVO
echo   2. Digite: opencode
echo   3. Digite: /models
echo   4. Selecione: MiniMax M2.5 Free
echo.
echo ================================================
echo.
pause