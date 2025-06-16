@echo off
REM GitHub MCP Server Startup Script for Windows
REM This script starts the GitHub MCP Server using Docker

echo Starting GitHub MCP Server...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if GitHub token is set
if "%GITHUB_PERSONAL_ACCESS_TOKEN%"=="" (
    echo Error: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set.
    echo Please set your GitHub Personal Access Token:
    echo set GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
    pause
    exit /b 1
)

REM Pull the latest GitHub MCP Server image
echo Pulling GitHub MCP Server Docker image...
docker pull ghcr.io/github/github-mcp-server

if %errorlevel% neq 0 (
    echo Error: Failed to pull GitHub MCP Server image.
    pause
    exit /b 1
)

REM Start the GitHub MCP Server
echo Starting GitHub MCP Server on port 3100...
docker run -d ^
    --name github-mcp-server ^
    -p 3100:3100 ^
    -e GITHUB_PERSONAL_ACCESS_TOKEN=%GITHUB_PERSONAL_ACCESS_TOKEN% ^
    -e GITHUB_TOOLSETS=repos,issues,pull_requests,users,context ^
    -e GITHUB_READ_ONLY=false ^
    ghcr.io/github/github-mcp-server

if %errorlevel% equ 0 (
    echo GitHub MCP Server started successfully!
    echo Server is running on http://localhost:3100
    echo You can now enable the github-mcp tool in the MCP Integration Plugin.
) else (
    echo Error: Failed to start GitHub MCP Server.
)

pause
