# Instalação MiniMax M2.5 Free para OpenCode
# Execute: powershell -ExecutionPolicy Bypass -File install_minimax.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Instalacao MiniMax M2.5 Free" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se OpenCode esta instalado
$opencodeInstalled = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $opencodeInstalled) {
    Write-Host "[INFO] OpenCode nao encontrado. Instalando..." -ForegroundColor Yellow
    npm i -g opencode-ai
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar OpenCode" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] OpenCode ja instalado" -ForegroundColor Green
}

# Criar diretorio de configuracao
$configDir = "$env:USERPROFILE\.config\opencode"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Proximos Passos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://openrouter.ai" -ForegroundColor Yellow
Write-Host "2. Crie uma conta gratuita" -ForegroundColor Yellow
Write-Host "3. Va em 'API Keys' e crie uma chave" -ForegroundColor Yellow
Write-Host "4. Copie a chave (sk-or-v1-...)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois execute:" -ForegroundColor White
Write-Host "  opencode" -ForegroundColor Green
Write-Host "  /connect" -ForegroundColor Green
Write-Host "  (selecione OpenRouter e cole a chave)" -ForegroundColor Green
Write-Host "  /models" -ForegroundColor Green
Write-Host "  (selecione MiniMax M2.5 Free)" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")