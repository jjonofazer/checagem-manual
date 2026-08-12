@echo off
setlocal enabledelayedexpansion

set "BASE=%~dp0"
set "BACKEND=%BASE%server"
set "BACKUPDIR=%BACKEND%\backups"

if exist "%BACKEND%\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /i "BACKUP_OUTPUT_DIR=" "%BACKEND%\.env" 2^>nul`) do (
    if not "%%B"=="" (
      set "ENV_BACKUPDIR=%%B"
      set "ENV_BACKUPDIR=!ENV_BACKUPDIR:"=!"
      if "!ENV_BACKUPDIR:~1,1!"==":" (
        set "BACKUPDIR=!ENV_BACKUPDIR!"
      ) else if "!ENV_BACKUPDIR:~0,2!"=="\\" (
        set "BACKUPDIR=!ENV_BACKUPDIR!"
      ) else (
        set "BACKUPDIR=!BACKEND!\!ENV_BACKUPDIR!"
      )
    )
  )
)

if not exist "%BACKUPDIR%" mkdir "%BACKUPDIR%"

:menu
cls
echo ============================================
echo   Checagem Manual - Restauracao de Backup
echo ============================================
echo   Pasta de backups: %BACKUPDIR%
echo.
echo   1. Restaurar backup mais recente
echo   2. Restaurar backup especifico
echo   3. Listar backups disponiveis
echo   4. Ver espaco em disco
echo   5. Apagar arquivos .restaurado antigos
echo   6. Sair
echo ============================================
set /p "OPCAO=Escolha uma opcao: "

if "%OPCAO%"=="1" goto recente
if "%OPCAO%"=="2" goto especifico
if "%OPCAO%"=="3" goto listar
if "%OPCAO%"=="4" goto espaco
if "%OPCAO%"=="5" goto limpar
if "%OPCAO%"=="6" goto fim
goto menu

:recente
set "ARQ="
for /f "delims=" %%F in ('powershell -NoProfile -Command "$dir='%BACKUPDIR%'; if (Test-Path -LiteralPath $dir) { Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -like 'backup-*.sql' -or $_.Name -like 'backup-*.sql.gz' -or $_.Name -like 'backup-*.sql.gz.enc' -or $_.Name -like 'backup-*.enc' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName }"') do set "ARQ=%%F"
if "%ARQ%"=="" (
  echo Nenhum backup encontrado em %BACKUPDIR%.
  pause
  goto menu
)
echo Restaurando: %ARQ%
cd /d "%BACKEND%"
node "scripts\restaurarBackup.js" "%ARQ%" --yes
pause
goto menu

:especifico
call :listar_silencioso
echo.
set /p "NOMEARQ=Digite o nome do arquivo ou caminho completo: "
if "%NOMEARQ%"=="" goto menu
if exist "%NOMEARQ%" (
  set "ARQ=%NOMEARQ%"
) else (
  set "ARQ=%BACKUPDIR%\%NOMEARQ%"
)
cd /d "%BACKEND%"
node "scripts\restaurarBackup.js" "%ARQ%"
pause
goto menu

:listar
call :listar_silencioso
pause
goto menu

:listar_silencioso
if not exist "%BACKUPDIR%" (
  echo Pasta de backups nao encontrada: %BACKUPDIR%
  exit /b 0
)
powershell -NoProfile -Command "$dir='%BACKUPDIR%'; Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -like 'backup-*.sql' -or $_.Name -like 'backup-*.sql.gz' -or $_.Name -like 'backup-*.sql.gz.enc' -or $_.Name -like 'backup-*.enc' } | Sort-Object LastWriteTime -Descending | Select-Object -ExpandProperty Name"
exit /b 0

:espaco
powershell -NoProfile -Command "$drive=(Split-Path -Path '%BACKUPDIR%' -Qualifier).TrimEnd(':'); Get-PSDrive -Name $drive | Select-Object Name,@{N='LivreGB';E={[math]::Round($_.Free/1GB,2)}},@{N='UsadoGB';E={[math]::Round($_.Used/1GB,2)}} | Format-Table -AutoSize"
pause
goto menu

:limpar
echo Apagando arquivos *.restaurado.* com mais de 7 dias em %BACKUPDIR%...
forfiles /p "%BACKUPDIR%" /m "*.restaurado.*" /d -7 /c "cmd /c del @path" 2>nul
echo Concluido.
pause
goto menu

:fim
endlocal
exit /b 0
