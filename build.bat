@echo off
rem Rebuilds the UI into backend\dist, then the three standalone binaries in this folder (static, no CGO).
setlocal
cd /d "%~dp0frontend" || exit /b 1
call npm run build || exit /b 1
cd /d "%~dp0backend" || exit /b 1
set CGO_ENABLED=0
set GOOS=windows
set GOARCH=amd64
go build -trimpath -ldflags="-s -w" -o ..\anime-stream-windows-amd64.exe . || exit /b 1
set GOOS=linux
go build -trimpath -ldflags="-s -w" -o ..\anime-stream-linux-amd64 . || exit /b 1
set GOARCH=arm64
go build -trimpath -ldflags="-s -w" -o ..\anime-stream-linux-arm64 . || exit /b 1
echo Done: anime-stream-windows-amd64.exe, anime-stream-linux-amd64, anime-stream-linux-arm64

