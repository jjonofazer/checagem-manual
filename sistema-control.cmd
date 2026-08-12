@echo off
setlocal enabledelayedexpansion

set "SERVICO_API=ChecagemManualAPI"
set "SERVICO_WEB=ChecagemManualWeb"
set "BASE=%~dp0"
set "BACKEND=%BASE%server"
set "LOGDIR=%BASE%logs"
set "BACKUPDIR=%BACKEND%\backups"
set "PORTA_API=6001"
set "PORTA_WEB=6001"
set "URL_WEB=http://localhost:%PORTA_WEB%"
set "URL_API=http://localhost:%PORTA_API%/api"
set "NSSM=nssm"

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

:menu
cls
echo ============================================
echo   Checagem Manual - Painel dos Servicos
echo ============================================
echo   Servico NSSM: %SERVICO_API% (API + interface, porta %PORTA_WEB%)
echo   Servico %SERVICO_WEB%: desativado (consolidado no servico acima)
echo   Logs: %LOGDIR%
echo   Backups: %BACKUPDIR%
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
echo   12. Criar backup agora
echo   13. Abrir pasta de backups
echo   14. Sair
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
if "%OPCAO%"=="14" goto fim
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
echo Criando backup criptografado agora...
cd /d "%BACKEND%"
node "scripts\criarBackup.js"
pause
goto menu

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
