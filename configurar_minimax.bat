@echo off
chcp 65001 >nul
title Configuracao MiniMax M2.5 Free

echo ╔══════════════════════════════════════════════════════════════╗
echo ║     CONFIGURACAO AUTOMATICA - MiniMax M2.5 Free            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Este script vai configurar tudo automaticamente para voce!
echo.
echo ══════════════════════════════════════════════════════════════
echo  PASSO 1: Criar chave de API no OpenRouter
echo ══════════════════════════════════════════════════════════════
echo.
echo 1. O navegador vai abrir no OpenRouter
echo 2. Faca login com sua conta
echo 3. Clique em "API Keys" no menu esquerdo
echo 4. Clique em "Create Key"
echo 5. Digite um nome (ex: "opencode")
echo 6. Clique em "Create"
echo 7. COPIE a chave que aparecer
echo.
echo ══════════════════════════════════════════════════════════════
echo.

timeout /t 3

REM Abrir navegador no OpenRouter
start https://openrouter.ai/keys

echo Aguardando voce criar a chave...
echo.
echo ══════════════════════════════════════════════════════════════
echo  PASSO 2: Cole sua chave de API abaixo
echo ══════════════════════════════════════════════════════════════
echo.

set /p APIKEY="Cole sua API Key aqui (sk-or-v1-...): "

if "%APIKEY%"=="" (
    echo.
    echo [ERRO] Voce nao colou a chave! Tente novamente.
    pause
    exit /b 1
)

echo.
echo [OK] Chave recebida! Configurando...

REM Criar diretorio de configuracao
if not exist "%USERPROFILE%\.config\opencode" mkdir "%USERPROFILE%\.config\opencode"

REM Criar arquivo de configuracao com a chave do usuario
echo { > "%USERPROFILE%\.config\opencode\opencode.json"
echo   "$schema": "https://opencode.ai/config.json", >> "%USERPROFILE%\.config\opencode\opencode.json"
echo   "provider": { >> "%USERPROFILE%\.config\opencode\opencode.json"
echo     "openrouter": { >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       "npm": "@ai-sdk/openai-compatible", >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       "name": "MiniMax M2.5 Free", >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       "options": { >> "%USERPROFILE%\.config\opencode\opencode.json"
echo         "baseURL": "https://openrouter.ai/api/v1", >> "%USERPROFILE%\.config\opencode\opencode.json"
echo         "apiKey": "%APIKEY%" >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       }, >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       "models": { >> "%USERPROFILE%\.config\opencode\opencode.json"
echo         "minimax-m2.5-free": { >> "%USERPROFILE%\.config\opencode\opencode.json"
echo           "name": "minimax/minimax-m2.5:free" >> "%USERPROFILE%\.config\opencode\opencode.json"
echo         } >> "%USERPROFILE%\.config\opencode\opencode.json"
echo       } >> "%USERPROFILE%\.config\opencode\opencode.json"
echo     } >> "%USERPROFILE%\.config\opencode\opencode.json"
echo   }, >> "%USERPROFILE%\.config\opencode\opencode.json"
echo   "model": "openrouter/minimax/minimax-m2.5:free" >> "%USERPROFILE%\.config\opencode\opencode.json"
echo } >> "%USERPROFILE%\.config\opencode\opencode.json"

echo.
echo ══════════════════════════════════════════════════════════════
echo  CONFIGURACAO CONCLUIDA!
echo ══════════════════════════════════════════════════════════════
echo.
echo Arquivo salvo em: %USERPROFILE%\.config\opencode\opencode.json
echo.
echo PARA USAR O MINIMAX M2.5:
echo.
echo 1. Abra um NOVO terminal
echo 2. Digite: opencode
echo 3. Digite: /models
echo 4. Selecione: MiniMax M2.5 Free
echo.
echo ══════════════════════════════════════════════════════════════
echo.
pause