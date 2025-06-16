# MCP集成插件扩展开发指南

## 概述

本指南详细说明如何扩展MCP集成插件，包括添加自定义场景类型、集成新的MCP工具、以及高级配置选项。

## 1. 自定义MCP工具配置

### 1.1 多搜索引擎配置示例

```json
{
  "tools": {
    "google-search": {
      "enabled": true,
      "serverUrl": "http://localhost:3001/mcp",
      "priority": 1.0,
      "sceneTypes": ["search"],
      "customSettings": {
        "safeSearch": true,
        "maxResults": 5,
        "language": "zh-CN"
      }
    },
    "bing-search": {
      "enabled": true,
      "serverUrl": "http://localhost:3002/mcp",
      "priority": 0.9,
      "sceneTypes": ["search"],
      "customSettings": {
        "market": "zh-CN",
        "safeSearch": "Moderate"
      }
    }
  },
  "sceneRules": {
    "search": {
      "primaryTool": "google-search",
      "fallbackTools": ["bing-search"],
      "loadBalancing": true,
      "failoverEnabled": true
    }
  }
}
```

### 1.2 工具选择策略

系统支持多种工具选择策略：

- **优先级策略**：根据priority值选择
- **负载均衡**：轮询使用多个同类工具
- **故障转移**：主工具失败时自动切换
- **用户偏好**：根据用户设置选择

## 2. 自定义场景类型

### 2.1 添加新场景类型

在`SceneAnalyzer.js`中添加新的场景模式：

```javascript
// 添加游戏场景
this.scenePatterns.set('gaming', {
    keywords: ['游戏', '玩家', '关卡', '技能', '装备', '战斗'],
    patterns: [
        /进入.*?游戏/i,
        /使用.*?技能/i,
        /装备.*?(武器|防具)/i,
        /战斗.*?(开始|结束)/i
    ],
    contextClues: ['game', 'player', 'skill', 'equipment', 'battle']
});

// 添加学习场景
this.scenePatterns.set('learning', {
    keywords: ['学习', '教学', '知识', '课程', '考试', '作业'],
    patterns: [
        /学习.*?(知识|技能)/i,
        /教.*?(课程|内容)/i,
        /考试.*?(准备|复习)/i
    ],
    contextClues: ['study', 'learn', 'education', 'course', 'exam']
});
```

### 2.2 配置场景工具映射

```javascript
// 在getToolsForScene方法中添加
gaming: [
    { name: 'game-engine', priority: 1, reason: '游戏引擎支持' },
    { name: 'skill-calculator', priority: 0.9, reason: '技能计算器' },
    { name: 'inventory-manager', priority: 0.8, reason: '物品管理' }
],
learning: [
    { name: 'knowledge-base', priority: 1, reason: '知识库查询' },
    { name: 'quiz-generator', priority: 0.9, reason: '测验生成器' },
    { name: 'progress-tracker', priority: 0.8, reason: '学习进度追踪' }
]
```

## 3. 高级场景配置

### 3.1 成人内容场景

```javascript
// 物理交互场景 - 成人内容
this.scenePatterns.set('adult_interaction', {
    keywords: ['亲密', '激情', '欲望', '诱惑', '感官'],
    patterns: [
        /感受.*?(激情|欲望)/i,
        /身体.*?(反应|感觉)/i,
        /(亲吻|拥抱|抚摸).*?(深情|激烈)/i
    ],
    contextClues: ['intimate', 'passion', 'desire', 'sensual', 'arousal'],
    ageRestriction: 18,
    contentWarning: true
});
```

### 3.2 情感矩阵场景

```javascript
// 复杂情感状态
this.scenePatterns.set('complex_emotion', {
    keywords: ['矛盾', '复杂', '纠结', '混乱', '冲突'],
    patterns: [
        /情感.*?(矛盾|复杂)/i,
        /内心.*?(纠结|冲突)/i,
        /感觉.*?(混乱|困惑)/i
    ],
    contextClues: ['complex', 'conflicted', 'confused', 'mixed'],
    requiresAdvancedAnalysis: true
});
```

## 4. 自定义MCP工具开发

### 4.1 创建自定义工具

```javascript
// 注册自定义工具
mcpEngine.toolManager.registerTool('custom-physics', {
    name: 'custom-physics',
    description: '自定义物理引擎',
    inputSchema: {
        type: 'object',
        properties: {
            action: { type: 'string' },
            intensity: { type: 'number', minimum: 0, maximum: 10 },
            participants: { type: 'array', items: { type: 'string' } }
        },
        required: ['action']
    },
    handler: async (args) => {
        // 自定义物理计算逻辑
        const { action, intensity = 5, participants = [] } = args;
        
        const result = {
            action: action,
            intensity: intensity,
            effects: calculatePhysicalEffects(action, intensity),
            participants: participants,
            timestamp: Date.now()
        };
        
        return result;
    }
});
```

### 4.2 高级工具配置

```javascript
// 情感矩阵分析器
mcpEngine.toolManager.registerTool('emotion-matrix', {
    name: 'emotion-matrix',
    description: '多维情感状态分析器',
    inputSchema: {
        type: 'object',
        properties: {
            text: { type: 'string' },
            context: { type: 'object' },
            history: { type: 'array' }
        }
    },
    handler: async (args) => {
        const emotionMatrix = {
            primary: analyzeEmotions(args.text),
            secondary: analyzeSubtleEmotions(args.text),
            intensity: calculateIntensity(args.text),
            stability: assessStability(args.history),
            triggers: identifyTriggers(args.context),
            recommendations: generateRecommendations()
        };
        
        return emotionMatrix;
    }
});
```

## 5. 配置最佳实践

### 5.1 性能优化配置

```json
{
  "settings": {
    "maxToolsPerGeneration": 3,
    "timeoutMs": 8000,
    "confidenceThreshold": 0.4,
    "enableCaching": true
  },
  "advancedSettings": {
    "toolSelection": {
      "strategy": "priority_weighted",
      "maxConcurrentCalls": 3
    },
    "caching": {
      "strategy": "intelligent",
      "maxCacheSize": "100MB",
      "ttlVariation": true
    },
    "performance": {
      "adaptiveTimeout": true,
      "circuitBreaker": true,
      "rateLimiting": true
    }
  }
}
```

### 5.2 安全配置

```json
{
  "security": {
    "contentFiltering": true,
    "ageVerification": true,
    "auditLogging": true,
    "apiKeyRotation": true
  },
  "contentRules": {
    "adult_content": {
      "enabled": false,
      "ageRestriction": 18,
      "explicitWarnings": true
    },
    "violence": {
      "level": "moderate",
      "filtering": true
    }
  }
}
```

## 6. 扩展API

### 6.1 自定义场景分析API

```javascript
// 添加自定义分析端点
router.post('/analyze/custom', async (req, res) => {
    const { text, sceneType, customRules } = req.body;
    
    // 使用自定义规则分析
    const analysis = await mcpEngine.sceneAnalyzer.analyzeWithCustomRules(
        text, 
        sceneType, 
        customRules
    );
    
    res.json(analysis);
});
```

### 6.2 工具管理API

```javascript
// 动态添加工具
router.post('/tools/register', async (req, res) => {
    const { toolDefinition } = req.body;
    
    await mcpEngine.toolManager.registerTool(
        toolDefinition.name, 
        toolDefinition
    );
    
    res.json({ success: true });
});
```

## 7. 调试和监控

### 7.1 调试模式

```json
{
  "settings": {
    "debugMode": true
  },
  "debugging": {
    "logLevel": "verbose",
    "traceRequests": true,
    "performanceMetrics": true,
    "errorDetails": true
  }
}
```

### 7.2 监控指标

系统自动收集以下指标：
- 工具调用成功率
- 平均响应时间
- 场景识别准确率
- 缓存命中率
- 错误频率

## 8. 示例用例

### 8.1 游戏RP场景

```javascript
// 用户输入："我要使用火球术攻击敌人"
// 系统识别：gaming场景 (置信度: 0.9)
// 调用工具：game-engine, skill-calculator
// 结果：火球术伤害计算、MP消耗、命中率等
```

### 8.2 学习场景

```javascript
// 用户输入："帮我解释一下量子力学"
// 系统识别：learning场景 (置信度: 0.8)
// 调用工具：knowledge-base, explanation-generator
// 结果：量子力学基础概念、相关资料、学习建议
```

### 8.3 情感分析场景

```javascript
// 用户输入："我感到既兴奋又紧张"
// 系统识别：complex_emotion场景 (置信度: 0.7)
// 调用工具：emotion-matrix, empathy-engine
// 结果：情感状态分析、共情回应、情绪调节建议
```

## 9. 故障排除

### 9.1 常见问题

1. **场景识别不准确**
   - 调整关键词和模式
   - 降低置信度阈值
   - 添加更多上下文线索

2. **工具调用失败**
   - 检查MCP服务状态
   - 验证网络连接
   - 查看错误日志

3. **性能问题**
   - 减少并发工具数量
   - 启用缓存
   - 优化超时设置

### 9.2 日志分析

```javascript
// 启用详细日志
{
  "settings": {
    "debugMode": true
  },
  "logging": {
    "level": "debug",
    "includeStackTrace": true,
    "logToFile": true
  }
}
```

通过这个扩展指南，您可以完全自定义MCP集成插件，满足各种特殊需求和场景！
