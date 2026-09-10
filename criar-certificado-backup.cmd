@echo off
setlocal

set "BASE=%~dp0"
set "SCRIPT=%BASE%criar-certificado-backup.ps1"

echo ============================================
echo   Checagem Manual - Criar Certificado de Backup
echo ============================================
echo.
echo Isso gera o certificado (.pfx) usado para criptografar os backups do banco.
echo Se ja existir um, o script preserva uma copia do antigo automaticamente.
echo.
echo No proximo passo vai pedir a SENHA do PFX - so voce deve saber essa senha,
echo guarde-a em um lugar seguro (fora do servidor). Se perder o arquivo .pfx
echo ou a senha, os backups ja feitos ficam permanentemente irrecuperaveis.
echo.
pause

if not exist "%SCRIPT%" (
  echo Script nao encontrado: %SCRIPT%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"

echo.
echo Lembrete: defina BACKUP_PFX_PASSWORD no server\.env com a mesma senha
echo que voce acabou de digitar.
echo.
pause
endlocal
exit /b 0
