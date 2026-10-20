@echo off
setlocal enabledelayedexpansion

set "SERVICO_API=ChecagemManualAPI"
set "SERVICO_WEB=ChecagemManualWeb"
set "BASE=%~dp0"
rem Copia do painel fora da pasta do projeto (ex.: Area de Trabalho) usa o caminho fixo.
if not exist "%BASE%server\backup.js" set "BASE=C:\checagem-manual\"
set "BACKEND=%BASE%server"
set "LOGDIR=%BASE%logs"
set "BACKUPDIR=%BACKEND%\backups"
set "PORTA_API=6001"
set "PORTA_WEB=6001"
set "URL_WEB=http://localhost:%PORTA_WEB%"
set "URL_API=http://localhost:%PORTA_API%/api"
set "NSSM=nssm"
set "LOGBACKUPDIR=G:\.shortcut-targets-by-id\1I5rxcXA115ID7UE6Zcx1yjiRObYcHfll\BACKUP - LOG"
set "LOGBACKUPSISTEMA=CHECAGEM"
set "LOGBACKUPDISPOSITIVO=SERVER-09"

if exist "C:\nssm\nssm.exe" set "NSSM=C:\nssm\nssm.exe"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

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

rem Mesmos valores que o backend usa para o log JSON (server\backup.js).
if exist "%BACKEND%\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /i "BACKUP_LOG_DIR= BACKUP_LOG_SISTEMA= BACKUP_LOG_DISPOSITIVO=" "%BACKEND%\.env" 2^>nul`) do (
    set "VALOR=%%B"
    if defined VALOR set "VALOR=!VALOR:"=!"
    if /i "%%A"=="BACKUP_LOG_DIR" if defined VALOR set "LOGBACKUPDIR=!VALOR!"
    if /i "%%A"=="BACKUP_LOG_SISTEMA" if defined VALOR set "LOGBACKUPSISTEMA=!VALOR!"
    if /i "%%A"=="BACKUP_LOG_DISPOSITIVO" if defined VALOR set "LOGBACKUPDISPOSITIVO=!VALOR!"
  )
)
set "LOGBACKUPARQ=%LOGBACKUPDIR%\log_Backup_%LOGBACKUPDISPOSITIVO%_%LOGBACKUPSISTEMA%.json"

:menu
cls
echo ============================================
echo   Checagem Manual - Painel dos Servicos
echo ============================================
echo   Servico NSSM: %SERVICO_API% (API + interface, porta %PORTA_WEB%)
echo   Servico %SERVICO_WEB%: desativado (consolidado no servico acima)
echo   Logs: %LOGDIR%
echo   Backups: %BACKUPDIR%
echo   Log do backup: %LOGBACKUPARQ%
echo.
echo   1. Iniciar servico
echo   2. Parar servico
echo   3. Reiniciar servico
echo   4. Ver status
echo   5. Ver log em tempo real
echo   6. (nao usado - servico web foi consolidado)
echo   7. Buscar palavra nos logs
echo   8. Abrir pasta de logs
echo   9. Testar portas (netstat)
echo   10. Abrir sistema no navegador
echo   11. Abrir API no navegador
echo   12. Criar backup agora (grava log no disco G:)
echo   13. Abrir pasta de backups
echo   14. Ver log do backup no disco G:
echo   15. Sair
echo ============================================
set /p "OPCAO=Escolha uma opcao: "

if "%OPCAO%"=="1" goto iniciar
if "%OPCAO%"=="2" goto parar
if "%OPCAO%"=="3" goto reiniciar
if "%OPCAO%"=="4" goto status
if "%OPCAO%"=="5" goto logs_api
if "%OPCAO%"=="6" goto logs_web
if "%OPCAO%"=="7" goto buscar
if "%OPCAO%"=="8" goto pasta
if "%OPCAO%"=="9" goto porta
if "%OPCAO%"=="10" goto navegador
if "%OPCAO%"=="11" goto api
if "%OPCAO%"=="12" goto backup
if "%OPCAO%"=="13" goto pasta_backup
if "%OPCAO%"=="14" goto ver_log_backup
if "%OPCAO%"=="15" goto fim
goto menu

:iniciar
call :checar_nssm
echo Iniciando servico (API + interface, porta %PORTA_WEB%)...
"%NSSM%" start %SERVICO_API%
pause
goto menu

:parar
call :checar_nssm
echo Parando servico...
"%NSSM%" stop %SERVICO_API%
pause
goto menu

:reiniciar
call :checar_nssm
echo Reiniciando servico...
"%NSSM%" restart %SERVICO_API%
pause
goto menu

:status
call :checar_nssm
echo Status do servico:
"%NSSM%" status %SERVICO_API%
pause
goto menu

:logs_api
if not exist "%LOGDIR%\api.log" type nul > "%LOGDIR%\api.log"
if not exist "%LOGDIR%\api-error.log" type nul > "%LOGDIR%\api-error.log"
echo Pressione CTRL+C para sair dos logs.
powershell -NoProfile -Command "Get-Content -Path '%LOGDIR%\api.log','%LOGDIR%\api-error.log' -Wait -Tail 30 -Encoding utf8"
goto menu

:logs_web
if not exist "%LOGDIR%\web.log" type nul > "%LOGDIR%\web.log"
if not exist "%LOGDIR%\web-error.log" type nul > "%LOGDIR%\web-error.log"
echo Pressione CTRL+C para sair dos logs.
powershell -NoProfile -Command "Get-Content -Path '%LOGDIR%\web.log','%LOGDIR%\web-error.log' -Wait -Tail 30 -Encoding utf8"
goto menu

:buscar
set /p "TERMO=Digite a palavra/termo a buscar: "
if "%TERMO%"=="" goto menu
powershell -NoProfile -Command "Select-String -Path '%LOGDIR%\api.log','%LOGDIR%\api-error.log','%LOGDIR%\web.log','%LOGDIR%\web-error.log' -Pattern '%TERMO%' -Encoding utf8 -ErrorAction SilentlyContinue"
pause
goto menu

:pasta
start "" "%LOGDIR%"
goto menu

:porta
echo Porta da API: %PORTA_API%
netstat -aon | findstr :%PORTA_API%
echo.
echo Porta da interface: %PORTA_WEB%
netstat -aon | findstr :%PORTA_WEB%
pause
goto menu

:navegador
start "" "%URL_WEB%"
goto menu

:api
start "" "%URL_API%"
goto menu

:backup
if not exist "G:\" (
  echo ATENCAO: disco G: nao encontrado. Abra o Google Drive antes, senao o log nao sera gravado.
  echo.
)
echo Criando backup criptografado agora...
for /f %%T in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMddHHmmss')"') do set "INICIO_BACKUP=%%T"
cd /d "%BACKEND%"
node "scripts\criarBackup.js"
echo.
set "LOG_ATUALIZADO="
for /f %%T in ('powershell -NoProfile -Command "$f='%LOGBACKUPARQ%'; if (Test-Path -LiteralPath $f) { (Get-Item -LiteralPath $f).LastWriteTime.ToString('yyyyMMddHHmmss') }"') do (
  if "%%T" GEQ "%INICIO_BACKUP%" set "LOG_ATUALIZADO=1"
)
if defined LOG_ATUALIZADO (
  echo Log gravado no disco G: %LOGBACKUPARQ%
  call :mostrar_log_backup
) else (
  echo ERRO: o log NAO foi atualizado em %LOGBACKUPARQ%
  echo Confira se o Google Drive esta aberto e o disco G: acessivel.
)
pause
goto menu

:ver_log_backup
if not exist "%LOGBACKUPARQ%" (
  echo Log nao encontrado: %LOGBACKUPARQ%
  pause
  goto menu
)
call :mostrar_log_backup
pause
goto menu

:mostrar_log_backup
powershell -NoProfile -Command "Get-Content -LiteralPath '%LOGBACKUPARQ%' -Encoding utf8"
exit /b 0

:pasta_backup
start "" "%BACKUPDIR%"
goto menu

:checar_nssm
if exist "%NSSM%" exit /b 0
where nssm >nul 2>nul
if "%ERRORLEVEL%"=="0" exit /b 0
echo NSSM nao encontrado. Confira se existe C:\nssm\nssm.exe ou se nssm esta no PATH.
pause
goto menu

:fim
endlocal
exit /b 0
