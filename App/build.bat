@echo off

for %%I in ("%~dp0.") do set "CURRENT_DIR=%%~nxI"
if /I not "%CURRENT_DIR%"=="App" (
    echo [ERROR] This script must be run from inside the /App directory.
    echo Current location: %CD%
    pause & exit /b
)

cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause & exit /b
)

python -m PyInstaller --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller missing. Install it with 'pip install -r ../requirements.txt'.
    pause & exit /b
)

python -m PyInstaller --clean bridge.spec
if not exist dist mkdir dist
if exist dist\bridge.exe del /Q dist\bridge.exe
copy /Y version.txt dist\version.txt >nul
pause