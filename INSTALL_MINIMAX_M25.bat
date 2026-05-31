@echo off
chcp 65001 >nul
echo ========================================
echo  Instalação MiniMax M2.5 Free
echo ========================================
echo.

REM Verificar se o OpenCode já está instalado
where opencode >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] OpenCode não encontrado. Instalando...
    echo.
    curl -fsSL https://opencode.ai/install | bash
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar OpenCode. Instale manualmente: npm i -g opencode-ai
        pause
        exit /b 1
    )
) else (
    echo [OK] OpenCode já instalado.
)

echo.
echo ========================================
echo  Configuração do MiniMax M2.5 Free
echo ========================================
echo.
echo Para usar o MiniMax M2.5 Free gratuitamente:
echo.
echo 1. Acesse: https://openrouter.ai
echo 2. Crie uma conta gratuita
echo 3. Vá em "API Keys" e crie uma chave
echo 4. Copie a chave (começa com sk-or-v1-...)
echo.

REM Criar diretório de configuração se não existir
if not exist "%USERPROFILE%\.config\opencode" mkdir "%USERPROFILE%\.config\opencode"

REM Criar arquivo de configuração
echo Criando configuração do MiniMax M2.5 Free...

(
echo {
echo   "$schema": "https://opencode.ai/config.json",
echo   "provider": {
echo     "openrouter": {
echo       "npm": "@ai-sdk/openai-compatible",
echo       "name": "MiniMax M2.5 Free",
echo       "options": {
echo         "baseURL": "https://openrouter.ai/api/v1",
echo         "apiKey": "SUA_API_KEY_AQUI"
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
) > "%USERPROFILE%\.config\opencode\opencode.json"

echo.
echo ========================================
echo  PRÓXIMOS PASSOS
echo ========================================
echo.
echo 1. Abra um novo terminal e digite: opencode
echo 2. Digite: /connect
echo 3. Selecione: OpenRouter
echo 4. Cole sua API Key quando solicitado
echo 5. Digite: /models
echo 6. Selecione: MiniMax M2.5 Free
echo.
echo O arquivo de configuração foi criado em:
echo %USERPROFILE%\.config\opencode\opencode.json
echo.
echo ATENÇÃO: Substitua "SUA_API_KEY_AQUI" pela sua chave real do OpenRouter!
echo.
pause