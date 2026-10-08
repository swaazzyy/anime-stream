@echo off
title GoAnime FLV Streaming Platform
echo ========================================================
echo        🎌 GoAnime FLV Streaming Platform
echo   Backend: Go + SQLite
echo   Frontend: React + Tailwind (Crunchyroll Theme)
echo ========================================================
echo.
cd /d "%~dp0backend"
echo [1/2] Starting Go Streaming Server on http://localhost:8080...
start "" http://localhost:8080
..\anime-stream-windows-amd64.exe
pause
