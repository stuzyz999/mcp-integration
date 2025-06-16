# SillyTavern MCP Integration Plugin

## 概述

这是一个为SillyTavern开发的智能MCP（Model Context Protocol）集成插件，能够在AI RP内容生成过程中自动识别场景并调用相应的MCP工具，极大提升角色扮演体验。

## 核心功能

### 🎯 智能场景识别
- **自动分析**：实时分析用户输入、聊天历史和角色设定
- **多场景支持**：天气、位置、时间、记忆、搜索、购物等场景
- **置信度评估**：基于关键词、正则模式和上下文线索的智能评分

### 🛠️ MCP工具管理
- **统一管理**：支持多个MCP服务同时连接
- **灵活配置**：工具启用/禁用、优先级设置、超时控制
- **健康监控**：实时监控工具连接状态和性能

### ⚡ 高性能调用
- **异步执行**：不阻塞RP生成流程
- **智能缓存**：避免重复调用，提升响应速度
- **错误处理**：优雅的超时和重试机制

### 🎨 用户友好界面
- **可视化配置**：直观的Web配置界面
- **实时监控**：工具状态、统计信息、日志查看
- **测试工具**：场景分析测试、工具调用测试

## 安装和配置

### 1. 插件安装
将插件文件夹放置到SillyTavern的`plugins`目录下：
```
SillyTavern/
├── plugins/
│   └── mcp-integration/
│       ├── index.js
│       ├── src/
│       ├── ui/
│       └── README.md
```

### 2. 启动SillyTavern
重启SillyTavern服务器，插件将自动加载。

### 3. 配置MCP工具
访问插件配置页面：`http://localhost:8000/plugins/mcp-integration/ui/mcp-config.html`

## 支持的MCP工具类型

### 🌤️ 天气工具 (weather-api)
- **场景触发**：天气相关对话
- **功能**：获取实时天气信息
- **示例**：用户说"今天天气怎么样？"

### 🔍 搜索工具 (web-search)
- **场景触发**：信息查询需求
- **功能**：搜索网络信息
- **示例**：用户问"告诉我关于量子计算的信息"

### 🧠 记忆工具 (conversation-memory)
- **场景触发**：回忆相关对话
- **功能**：检索历史对话记忆
- **示例**：用户说"还记得我们上次聊的吗？"

### 📚 RAG搜索 (rag-search)
- **场景触发**：文档查询需求
- **功能**：搜索知识库文档
- **示例**：角色需要专业知识支持

### 🗺️ 地图服务 (maps-api)
- **场景触发**：位置相关对话
- **功能**：提供地图和位置信息
- **示例**：用户问"附近有什么好吃的？"

## 配置示例

### 基础配置
```json
{
  "settings": {
    "autoTrigger": true,
    "maxToolsPerGeneration": 3,
    "timeoutMs": 8000,
    "confidenceThreshold": 0.4,
    "enableCaching": true,
    "debugMode": false
  },
  "tools": {
    "weather-api": {
      "enabled": true,
      "serverUrl": "http://localhost:3001/mcp",
      "priority": 1,
      "sceneTypes": ["weather"],
      "description": "获取实时天气信息"
    }
  }
}
```

### 高级场景规则
```javascript
// 自定义场景识别规则
scenePatterns.set('custom-scene', {
    keywords: ['关键词1', '关键词2'],
    patterns: [/正则表达式/i],
    contextClues: ['context1', 'context2']
});
```

## API接口

### 插件状态
```
GET /api/plugins/mcp-integration/status
```

### 工具管理
```
GET /api/plugins/mcp-integration/tools
POST /api/plugins/mcp-integration/tools/test
GET /api/plugins/mcp-integration/tools/health
```

### 场景分析
```
POST /api/plugins/mcp-integration/analyze
Body: { "text": "要分析的文本", "context": {} }
```

### 配置管理
```
GET /api/plugins/mcp-integration/config
POST /api/plugins/mcp-integration/config
POST /api/plugins/mcp-integration/settings
```

## 使用场景示例

### 场景1：天气查询
**用户输入**：`"外面下雨了吗？"`
**系统行为**：
1. 识别天气场景（置信度：0.8）
2. 调用weather-api工具
3. 获取当前天气信息
4. 将结果注入到AI生成上下文
5. AI基于实时天气信息生成回复

### 场景2：记忆回溯
**用户输入**：`"还记得我们第一次见面吗？"`
**系统行为**：
1. 识别记忆场景（置信度：0.9）
2. 调用conversation-memory工具
3. 搜索相关历史对话
4. 提供记忆片段给AI
5. AI基于历史信息生成连贯回复

### 场景3：信息查询
**用户输入**：`"帮我查一下最新的科技新闻"`
**系统行为**：
1. 识别搜索场景（置信度：0.7）
2. 调用web-search工具
3. 获取最新科技新闻
4. 整理信息摘要
5. AI基于实时信息生成回复

## 性能优化

### 缓存策略
- **结果缓存**：相同查询5分钟内使用缓存
- **智能失效**：基于内容变化自动更新
- **内存管理**：限制缓存大小，LRU淘汰

### 并发控制
- **异步调用**：多工具并行执行
- **超时保护**：防止长时间阻塞
- **优雅降级**：工具失败不影响生成

### 错误处理
- **重试机制**：自动重试失败的调用
- **熔断保护**：频繁失败时暂停工具
- **日志记录**：详细的错误日志和统计

## 故障排除

### 常见问题

1. **工具连接失败**
   - 检查MCP服务器是否运行
   - 验证URL和端口配置
   - 查看网络连接状态

2. **场景识别不准确**
   - 调整置信度阈值
   - 添加自定义关键词
   - 检查场景规则配置

3. **性能问题**
   - 减少最大工具数量
   - 降低超时时间
   - 启用缓存机制

### 调试模式
启用调试模式查看详细日志：
```json
{
  "settings": {
    "debugMode": true
  }
}
```

## 扩展开发

### 添加新场景类型
```javascript
// 在SceneAnalyzer.js中添加
this.scenePatterns.set('new-scene', {
    keywords: ['关键词'],
    patterns: [/模式/i],
    contextClues: ['线索']
});
```

### 自定义工具集成
```javascript
// 注册新工具
this.registerTool('custom-tool', {
    name: 'custom-tool',
    description: '自定义工具',
    handler: async (args) => {
        // 工具逻辑
        return result;
    }
});
```

## 许可证

本插件遵循MIT许可证。

## 贡献

欢迎提交Issue和Pull Request来改进这个插件！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础场景识别
- 实现MCP工具管理
- 提供Web配置界面
