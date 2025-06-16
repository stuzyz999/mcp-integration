#!/bin/bash
# GitHub MCP Server Startup Script for Linux/macOS
# This script starts the GitHub MCP Server using Docker

echo "Starting GitHub MCP Server..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if GitHub token is set
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
    echo "Error: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set."
    echo "Please set your GitHub Personal Access Token:"
    echo "export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here"
    exit 1
fi

# Pull the latest GitHub MCP Server image
echo "Pulling GitHub MCP Server Docker image..."
if ! docker pull ghcr.io/github/github-mcp-server; then
    echo "Error: Failed to pull GitHub MCP Server image."
    exit 1
fi

# Stop existing container if running
if docker ps -q -f name=github-mcp-server | grep -q .; then
    echo "Stopping existing GitHub MCP Server..."
    docker stop github-mcp-server
    docker rm github-mcp-server
fi

# Start the GitHub MCP Server
echo "Starting GitHub MCP Server on port 3100..."
if docker run -d \
    --name github-mcp-server \
    -p 3100:3100 \
    -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN" \
    -e GITHUB_TOOLSETS="repos,issues,pull_requests,users,context" \
    -e GITHUB_READ_ONLY="false" \
    ghcr.io/github/github-mcp-server; then
    
    echo "GitHub MCP Server started successfully!"
    echo "Server is running on http://localhost:3100"
    echo "You can now enable the github-mcp tool in the MCP Integration Plugin."
else
    echo "Error: Failed to start GitHub MCP Server."
    exit 1
fi
