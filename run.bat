@echo off
setlocal

echo ============================================
echo   BeeCollab Launcher
echo ============================================
echo.

REM ---------- Backend setup ----------
if not exist "%~dp0bee-collab-backend\node_modules\" (
    echo [SETUP] Backend dependencies missing. Installing...
    pushd "%~dp0bee-collab-backend"
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Backend 'npm install' failed. Aborting.
        popd
        pause
        exit /b 1
    )
    echo.
    echo [SETUP] Generating Prisma Client...
    call npx prisma generate
    if errorlevel 1 (
        echo.
        echo [ERROR] 'npx prisma generate' failed. Aborting.
        popd
        pause
        exit /b 1
    )
    popd
    echo [SETUP] Backend ready.
) else (
    echo [OK] Backend dependencies already installed.
)

echo.

REM ---------- Frontend setup ----------
if not exist "%~dp0bee-collab-frontend\node_modules\" (
    echo [SETUP] Frontend dependencies missing. Installing...
    pushd "%~dp0bee-collab-frontend"
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Frontend 'npm install' failed. Aborting.
        popd
        pause
        exit /b 1
    )
    popd
    echo [SETUP] Frontend ready.
) else (
    echo [OK] Frontend dependencies already installed.
)

echo.
echo ============================================
echo   Launching servers in separate windows...
echo ============================================
start "BeeCollab Backend" cmd /k "cd /d %~dp0bee-collab-backend && npm run start:dev"
start "BeeCollab Frontend" cmd /k "cd /d %~dp0bee-collab-frontend && npm run dev"

echo.
echo Backend  -> http://localhost:3000
echo Frontend -> http://localhost:3001
echo.
echo You can close this window. Close the server windows to stop them.
endlocal
