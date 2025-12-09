@echo off
REM VIEW-LOGS.bat
REM Double-click to view application logs

echo.
echo ================================================================
echo              Opening Application Logs
echo ================================================================
echo.

if exist "data\logs\" (
    cd data\logs
    for /f %%i in ('dir /b /o-d *.log 2^>nul') do (
        echo Opening: %%i
        notepad %%i
        goto :done
    )
    echo No log files found yet.
    echo Logs will be created after first run.
) else (
    echo Log directory doesn't exist yet.
    echo Logs will be created after first run of the POS system.
)

:done
echo.
pause
