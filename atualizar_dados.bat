@echo off
chcp 65001 >nul
title Atualizar Dados WebMAP PAEBM - SAG
color 0A

echo ==========================================
echo   ATUALIZADOR DE DADOS WEBMAP PAEBM - SAG
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/5] Listando arquivos JSON disponiveis...
echo.
set "count=0"
for %%f in (*.json) do (
    set /a count+=1
    set "file_!count!=%%f"
    echo   !count! - %%f
)
echo.

if %count%==0 (
    echo NENHUM ARQUIVO JSON ENCONTRADO!
    echo Coloque o arquivo JSON nesta pasta e tente novamente.
    pause
    exit /b 1
)

set /p "choice=Digite o NUMERO do arquivo com os dados novos: "

if not defined file_%choice% (
    echo Opcao invalida!
    pause
    exit /b 1
)

set "source=!file_%choice%!"
echo.
echo Arquivo selecionado: %source%
echo.

echo [2/5] Validando JSON...
node -e "try{JSON.parse(require('fs').readFileSync('%source%','utf8'));console.log('JSON valido!')}catch(e){console.log('ERRO: JSON invalido - '+e.message);process.exit(1)}"
if errorlevel 1 (
    echo O arquivo nao e um JSON valido!
    pause
    exit /b 1
)

echo [3/5] Copiando arquivos...
copy /y "%source%" "DADOS_COMPILADOS_PAEBM_SAG_JSON.json" >nul
copy /y "%source%" "DADOS_COMPILADOS_PAEBM_SAG_JSON_2.json" >nul
copy /y "%source%" "DADOS_COMPILADOS_PAEBM_SAG_JSON_3.json" >nul
echo   - DADOS_COMPILADOS_PAEBM_SAG_JSON.json [OK]
echo   - DADOS_COMPILADOS_PAEBM_SAG_JSON_2.json [OK]
echo   - DADOS_COMPILADOS_PAEBM_SAG_JSON_3.json [OK]
echo.

echo [4/5] Gerando data_questionarios.js...
node -e "var j=require('fs').readFileSync('%source%','utf8');require('fs').writeFileSync('js/data_questionarios.js','(function(){ self.DATA_QUESTIONARIOS = '+j+' })();','utf8');console.log('data_questionarios.js gerado com sucesso!')"
echo.

echo [5/5] Enviando para o GitHub...
git add DADOS_COMPILADOS_PAEBM_SAG_JSON.json DADOS_COMPILADOS_PAEBM_SAG_JSON_2.json DADOS_COMPILADOS_PAEBM_SAG_JSON_3.json js/data_questionarios.js
git commit -m "Atualizacao automatica de dados PAEBM - %date%"
git push origin main

echo.
echo ==========================================
echo   ATUALIZACAO CONCLUIDA!
echo   O Vercel ira atualizar automaticamente.
echo ==========================================
echo.
pause
