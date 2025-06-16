# GitHub MCP Server 安装和配置指南

## 概述

本指南将帮助您安装和配置GitHub MCP服务器，使其与SillyTavern MCP集成插件协同工作。

## 前置要求

1. **Docker Desktop** - 用于运行GitHub MCP服务器
2. **GitHub Personal Access Token** - 用于访问GitHub API
3. **SillyTavern** - 运行MCP集成插件

## 第一步：安装Docker

### Windows
1. 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 启动Docker Desktop
3. 确保Docker正在运行：
   ```cmd
   docker --version
   ```

### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io

# macOS (使用Homebrew)
brew install --cask docker

# 启动Docker服务
sudo systemctl start docker
```

## 第二步：创建GitHub Personal Access Token

1. 访问 [GitHub Settings > Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. 点击 "Generate new token (classic)"
3. 设置Token名称：`SillyTavern MCP Integration`
4. 选择过期时间（建议90天或更长）
5. 选择以下权限范围：
   - ✅ `repo` - 完整的仓库访问权限
   - ✅ `read:user` - 读取用户信息
   - ✅ `read:org` - 读取组织信息
   - ✅ `read:project` - 读取项目信息
6. 点击 "Generate token"
7. **重要**：复制生成的token并保存在安全的地方

## 第三步：设置环境变量

### Windows
```cmd
# 临时设置（当前会话有效）
set GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

# 永久设置（推荐）
setx GITHUB_PERSONAL_ACCESS_TOKEN "your_token_here"
```

### Linux/macOS
```bash
# 临时设置
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here' >> ~/.bashrc
source ~/.bashrc
```

## 第四步：启动GitHub MCP服务器

### 方法1：使用提供的脚本（推荐）

#### Windows
```cmd
cd plugins\mcp-integration\scripts
start-github-mcp.bat
```

#### Linux/macOS
```bash
cd plugins/mcp-integration/scripts
chmod +x start-github-mcp.sh
./start-github-mcp.sh
```

### 方法2：手动Docker命令

```bash
# 拉取镜像
docker pull ghcr.io/github/github-mcp-server

# 启动服务器
docker run -d \
  --name github-mcp-server \
  -p 3100:3100 \
  -e GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here" \
  -e GITHUB_TOOLSETS="repos,issues,pull_requests,users,context" \
  -e GITHUB_READ_ONLY="false" \
  ghcr.io/github/github-mcp-server
```

## 第五步：配置MCP集成插件

1. 启动SillyTavern
2. 访问MCP配置页面：`http://localhost:8000/plugins/mcp-integration/ui/mcp-config.html`
3. 在工具列表中找到 "github-mcp"
4. 启用该工具：
   - 将 "Enabled" 开关设置为开启
   - 确认服务器URL为：`http://localhost:3100/mcp`
   - 设置场景类型：`search, memory`
5. 点击 "Test Connection" 验证连接
6. 保存配置

## 第六步：验证安装

### 测试GitHub MCP服务器
```bash
# 检查容器状态
docker ps | grep github-mcp-server

# 查看日志
docker logs github-mcp-server

# 测试API响应
curl http://localhost:3100/health
```

### 测试插件集成
1. 在SillyTavern中开始一个新对话
2. 输入包含代码搜索相关的内容，例如：
   - "帮我搜索一下React的最新仓库"
   - "查找JavaScript相关的热门项目"
   - "我想了解Vue.js的源代码"
3. 观察AI回复是否包含GitHub搜索结果

## 可用的GitHub MCP工具

### 搜索工具
- `search_repositories` - 搜索GitHub仓库
- `search_code` - 搜索代码片段
- `search_issues` - 搜索问题和PR
- `search_users` - 搜索用户

### 仓库工具
- `get_repository` - 获取仓库信息
- `get_file_contents` - 获取文件内容
- `list_repository_files` - 列出仓库文件
- `get_repository_languages` - 获取仓库使用的编程语言

### 问题和PR工具
- `get_issue` - 获取问题详情
- `get_pull_request` - 获取PR详情
- `list_issues` - 列出仓库问题
- `create_issue` - 创建新问题

### 用户工具
- `get_user` - 获取用户信息
- `get_me` - 获取当前认证用户信息

## 故障排除

### 常见问题

1. **Docker连接失败**
   ```
   Error: Docker is not running
   ```
   **解决方案**：启动Docker Desktop

2. **GitHub Token无效**
   ```
   Error: 401 Unauthorized
   ```
   **解决方案**：检查token是否正确设置，是否有足够权限

3. **端口冲突**
   ```
   Error: Port 3100 already in use
   ```
   **解决方案**：
   ```bash
   # 停止现有容器
   docker stop github-mcp-server
   docker rm github-mcp-server
   
   # 或使用不同端口
   docker run -p 3101:3100 ...
   ```

4. **MCP插件连接失败**
   - 确认GitHub MCP服务器正在运行
   - 检查防火墙设置
   - 验证URL配置是否正确

### 调试命令

```bash
# 查看容器状态
docker ps -a

# 查看详细日志
docker logs -f github-mcp-server

# 进入容器调试
docker exec -it github-mcp-server /bin/sh

# 测试网络连接
curl -v http://localhost:3100/mcp/tools/list
```

## 高级配置

### 自定义工具集
```bash
# 只启用特定工具集
docker run -d \
  -e GITHUB_TOOLSETS="repos,users" \
  ghcr.io/github/github-mcp-server
```

### 只读模式
```bash
# 启用只读模式（不能修改仓库）
docker run -d \
  -e GITHUB_READ_ONLY="true" \
  ghcr.io/github/github-mcp-server
```

### 企业版GitHub
```bash
# 连接到GitHub Enterprise
docker run -d \
  -e GITHUB_HOST="https://github.your-company.com" \
  ghcr.io/github/github-mcp-server
```

## 安全注意事项

1. **Token安全**：
   - 不要在代码中硬编码token
   - 定期轮换token
   - 使用最小权限原则

2. **网络安全**：
   - 只在本地网络运行
   - 考虑使用HTTPS
   - 限制容器网络访问

3. **数据隐私**：
   - 了解哪些数据会被发送到GitHub
   - 审查日志输出
   - 考虑使用只读模式

## 更新和维护

### 更新GitHub MCP服务器
```bash
# 停止现有容器
docker stop github-mcp-server
docker rm github-mcp-server

# 拉取最新镜像
docker pull ghcr.io/github/github-mcp-server

# 重新启动
./start-github-mcp.sh
```

### 备份配置
定期备份您的配置文件：
- `config/github-mcp-config.json`
- 环境变量设置
- Docker compose文件（如果使用）

通过遵循本指南，您应该能够成功安装和配置GitHub MCP服务器，并将其与SillyTavern MCP集成插件配合使用！
