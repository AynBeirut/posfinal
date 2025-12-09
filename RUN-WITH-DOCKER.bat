@echo off
REM Install Docker Desktop and run this script

echo Checking Docker...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker not installed!
    echo.
    echo Install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo Building Docker image...
docker build -t odoo-pos .

echo.
echo Running container...
docker run -it --rm -p 8070:8070 -p 54320:54320 -v "%CD%\data:/app/data" odoo-pos

pause
