@echo off
echo ========================================
echo  VALIDADOR DE SINTAXE JAVASCRIPT
echo ========================================
echo.
node -e "const fs=require('fs');['js/map.js','js/data_questionarios.js','js/data_zas.js','js/data_zss.js','js/data_centro_urbano.js'].forEach(f=>{try{new Function(fs.readFileSync(f,'utf8'));console.log('OK: '+f)}catch(e){console.log('ERRO em '+f+': '+e.message)}})"
echo.
if %errorlevel% equ 0 (echo Todos os arquivos OK!) else (echo Ha ERROS para corrigir!)
echo.
pause
