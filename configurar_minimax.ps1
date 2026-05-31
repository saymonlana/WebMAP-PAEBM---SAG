# Configuracao Automatica MiniMax M2.5 Free
# Execute: powershell -ExecutionPolicy Bypass -File configurar_minimax.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " CONFIGURACAO AUTOMATICA - MiniMax M2.5 Free" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Abrir navegador para criar API Key
Write-Host "PASSO 1: Criar chave de API no OpenRouter" -ForegroundColor Yellow
Write-Host ""
Write-Host "O navegador vai abrir no OpenRouter." -ForegroundColor White
Write-Host "Fac Login, va em API Keys e crie uma chave." -ForegroundColor White
Write-Host ""

Start-Process "https://openrouter.ai/keys"

Write-Host "Pressione ENTER quando tiver copiado sua API Key..." -ForegroundColor Gray
Read-Host

# Passo 2: Solicitar API Key
Write-Host ""
Write-Host "PASSO 2: Cole sua chave de API" -ForegroundColor Yellow
Write-Host ""
$APIKey = Read-Host "Cole sua API Key (sk-or-v1-...)"

if ([string]::IsNullOrWhiteSpace($APIKey)) {
    Write-Host "[ERRO] Chave nao fornecida!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Chave recebida!" -ForegroundColor Green

# Passo 3: Criar configuracao
Write-Host ""
Write-Host "PASSO 3: Criando configuracao..." -ForegroundColor Yellow

$configDir = "$env:USERPROFILE\.config\opencode"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$config = @"
{
  "`$schema": "https://opencode.ai/config.json",
  "provider": {
    "openrouter": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "MiniMax M2.5 Free",
      "options": {
        "baseURL": "https://openrouter.ai/api/v1",
        "apiKey": "$APIKey"
      },
      "models": {
        "minimax-m2.5-free": {
          "name": "minimax/minimax-m2.5:free"
        }
      }
    }
  },
  "model": "openrouter/minimax/minimax-m2.5:free"
}
"@

$config | Out-File -FilePath "$configDir\opencode.json" -Encoding UTF8

Write-Host "[OK] Configuracao salva!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " CONFIGURACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivo: $configDir\opencode.json" -ForegroundColor Gray
Write-Host ""
Write-Host "PARA USAR O MINIMAX M2.5:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Abra um NOVO terminal" -ForegroundColor White
Write-Host "  2. Digite: opencode" -ForegroundColor Green
Write-Host "  3. Digite: /models" -ForegroundColor Green
Write-Host "  4. Selecione: MiniMax M2.5 Free" -ForegroundColor Green
Write-Host ""