@echo off
echo ========================================
echo   POS DATA BACKUP TOOL
echo ========================================
echo.

REM Create backup folder on Desktop with timestamp
set "timestamp=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%"
set "timestamp=%timestamp: =0%"
set "backupFolder=%USERPROFILE%\Desktop\POS-Backup-%timestamp%"

echo Creating backup folder...
mkdir "%backupFolder%"

echo.
echo Copying database files...
xcopy "C:\AynBeirutPOS-Data" "%backupFolder%\AynBeirutPOS-Data\" /E /I /Y

echo.
echo Copying backup files...
xcopy "D:\AynBeirutPOS-Backups" "%backupFolder%\AynBeirutPOS-Backups\" /E /I /Y

echo.
echo ========================================
echo   BACKUP COMPLETED!
echo ========================================
echo.
echo Backup saved to:
echo %backupFolder%
echo.
echo You can now safely install the new version.
echo.
pause
