@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "DOCKER_BIN=C:\Program Files\Docker\Docker\resources\bin"
set "PATH=%DOCKER_BIN%;%PATH%"
set "DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo.
echo TutorOS local stack  ^(Compose Postgres + FastAPI + Next.js shells^)
echo   UI     http://localhost:3000
echo   API    http://127.0.0.1:8000/docs
echo   OTP    000000   ^(mock SMS, never a live vendor^)
echo.

if exist "%DESKTOP%" (
  tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | find /I "Docker Desktop.exe" >nul
  if errorlevel 1 (
    echo Starting Docker Desktop...
    start "" "%DESKTOP%"
  )
)

echo Waiting for Docker engine...
set /a _n=0
:wait_docker
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
set /a _n+=1
if %_n% GEQ 45 (
  echo Docker engine did not start. Open Docker Desktop, wait until it is running, then run this .bat again.
  echo If docker is missing, add to PATH:
  echo   %DOCKER_BIN%
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto wait_docker
:docker_ok
echo Docker is ready.

echo Starting Compose Postgres...
docker compose up -d postgres
if errorlevel 1 (
  echo docker compose failed.
  exit /b 1
)

echo Waiting for Postgres health...
set /a _n=0
:wait_pg
docker inspect --format "{{.State.Health.Status}}" tutoros-postgres 2>nul | findstr /I "healthy" >nul
if not errorlevel 1 goto pg_ok
set /a _n+=1
if %_n% GEQ 60 (
  echo Postgres did not become healthy.
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto wait_pg
:pg_ok
echo Postgres is healthy.

if not exist "backend\.env" copy /Y ".env.example" "backend\.env" >nul
if not exist "frontend\.env.local" (
  echo NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000> "frontend\.env.local"
)

where python >nul 2>&1
if errorlevel 1 (
  echo python not found on PATH.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm not found on PATH.
  exit /b 1
)

echo Opening API and Next.js windows...
start "TutorOS API" /D "%~dp0backend" cmd /k "python -m pip install -r requirements.txt && python -m uvicorn app.main:app --reload --port 8000"
start "TutorOS UI" /D "%~dp0frontend" cmd /k "npm install && npm run dev"

echo Waiting for API...
set /a _n=0
:wait_api
curl -s -o nul -m 2 http://127.0.0.1:8000/docs >nul 2>&1
if not errorlevel 1 goto api_ok
set /a _n+=1
if %_n% GEQ 60 (
  echo API did not respond on port 8000. Check the TutorOS API window.
  goto print_mocks
)
timeout /t 2 /nobreak >nul
goto wait_api
:api_ok
echo API is up.

echo Waiting for Next.js...
set /a _n=0
:wait_ui
curl -s -o nul -m 2 http://localhost:3000 >nul 2>&1
if not errorlevel 1 goto ui_ok
set /a _n+=1
if %_n% GEQ 60 (
  echo Next.js did not respond on port 3000. Check the TutorOS UI window.
  goto print_mocks
)
timeout /t 2 /nobreak >nul
goto wait_ui
:ui_ok
echo Next.js is up.
start "" "http://localhost:3000/"
start "" "http://127.0.0.1:8000/docs"

:print_mocks
echo.
echo ------------------------------------------------------------------
echo Sign in on ANY catalog screen  ^(Mock login strip^). You do not need staff-login.
echo Exam-prep hides staff-login on purpose; faculty OTP is on every faculty screen.
echo.
echo OTP code          000000
echo API               http://127.0.0.1:8000
echo Mock Meet URL     created by "Attach mock video link"  ^(mock://meet/...^)
echo.
echo exam-prep workspace   aaaaaaaa-0001-4000-8000-000000000001
echo   owner +9101o   teacher +9101t   assistant +9101a
echo   student +9101s parent +9101p
echo   emails owner@exam-prep.sim  teacher@exam-prep.sim  student@exam-prep.sim
echo.
echo language-1on1 workspace aaaaaaaa-0002-4000-8000-000000000002  phones +9102*
echo music workspace         aaaaaaaa-0003-4000-8000-000000000003  phones +9103*
echo.
echo Open http://localhost:3000 for all 47 screen links.
echo Demo HTML ^(tutor-platform-demo.html^) is UI gold only — it is not this live stack.
echo ------------------------------------------------------------------
echo Leave the API and UI windows open.
endlocal
exit /b 0
