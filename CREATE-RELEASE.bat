@echo off
echo ========================================
echo  AYN BEIRUT POS - GitHub Release Setup
echo ========================================
echo.

echo STEP 1: Opening GitHub releases page...
start https://github.com/AynBeirut/posfinal/releases/new?tag=v1.0.0

echo.
echo ========================================
echo  INSTRUCTIONS:
echo ========================================
echo.
echo 1. GitHub will open in your browser
echo 2. Fill in the release form:
echo.
echo    Tag: v1.0.0 (already selected)
echo    Title: Ayn Beirut POS v1.0.0 - Production Release
echo.
echo 3. Copy release notes from:
echo    pos-v1\RELEASE-NOTES-v1.0.0.md
echo.
echo 4. Attach installer file:
echo    - Click "Attach binaries"
echo    - Upload: pos-v1\dist\Ayn Beirut POS-Setup-1.0.0.exe
echo.
echo 5. Check "Set as the latest release"
echo.
echo 6. Click "Publish release"
echo.
echo ========================================
echo.
echo Press any key to open the dist folder...
pause >nul

explorer "%~dp0pos-v1\dist"

echo.
echo ========================================
echo  QUICK CHECKLIST:
echo ========================================
echo  [ ] GitHub releases page is open
echo  [ ] Release title added
echo  [ ] Release notes copied
echo  [ ] Installer uploaded (73 MB)
echo  [ ] "Latest release" checked
echo  [ ] Release published
echo ========================================
echo.
echo Press any key to exit...
pause >nul
