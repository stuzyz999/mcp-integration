/**
 * SillyTavern MCP Integration Plugin
 * 智能MCP工具调用插件，在RP生成过程中自动调用相关MCP工具
 */

// 导入SillyTavern扩展API
import { event_types, eventSource, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, getContext } from "../../../extensions.js";

// 插件配置
const extensionName = "mcp-integration";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 默认设置
const defaultSettings = {
    enabled: true,
    autoTrigger: true,
    maxToolsPerGeneration: 3,
    timeoutMs: 8000,
    confidenceThreshold: 0.4,
    enableCaching: true,
    debugMode: false,
    tools: {
        "weather-api": {
            enabled: false,
            serverUrl: "http://localhost:3001/mcp",
            timeout: 5000,
            maxRetries: 2,
            cacheTimeout: 300000,
            priority: 1,
            sceneTypes: ["weather"],
            description: "获取实时天气信息",
        },
        "web-search": {
            enabled: false,
            serverUrl: "http://localhost:3002/mcp",
            timeout: 8000,
            maxRetries: 2,
            cacheTimeout: 600000,
            priority: 0.9,
            sceneTypes: ["search"],
            description: "搜索网络信息",
        },
        "conversation-memory": {
            enabled: false,
            serverUrl: "http://localhost:3003/mcp",
            timeout: 5000,
            maxRetries: 2,
            cacheTimeout: 300000,
            priority: 1,
            sceneTypes: ["memory"],
            description: "检索对话记忆",
        }
    }
};

// MCP集成引擎实例
let mcpEngine = null;

/**
 * 初始化扩展设置
 */
function initializeSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = structuredClone(defaultSettings);
    }

    // 确保所有默认设置都存在
    Object.keys(defaultSettings).forEach(key => {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = structuredClone(defaultSettings[key]);
        }
    });
}

/**
 * 保存设置
 */
function saveSettings() {
    saveSettingsDebounced();
}

/**
 * 获取当前设置
 */
function getSettings() {
    return extension_settings[extensionName];
}

/**
 * 更新设置
 */
function updateSettings(newSettings) {
    Object.assign(extension_settings[extensionName], newSettings);
    saveSettings();
}

/**
 * 场景分析器 - 客户端版本
 */
class ClientSceneAnalyzer {
    constructor() {
        this.scenePatterns = {
            weather: [
                /天气|weather|温度|temperature|下雨|rain|晴天|sunny|cloudy|阴天/i,
                /今天.*?(天气|温度)|明天.*?(天气|温度)/i
            ],
            search: [
                /搜索|search|查找|find|寻找|look for/i,
                /什么是|what is|告诉我|tell me about/i
            ],
            memory: [
                /记得|remember|回忆|recall|之前|before|earlier/i,
                /我们.*?(说过|谈过|讨论过)/i
            ]
        };
    }

    analyzeScene(context) {
        const { userInput = '', chatHistory = [] } = context;
        const text = userInput.toLowerCase();

        const results = [];

        for (const [sceneType, patterns] of Object.entries(this.scenePatterns)) {
            let confidence = 0;

            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    confidence = Math.max(confidence, 0.8);
                }
            }

            if (confidence > 0) {
                results.push({
                    sceneType,
                    confidence,
                    suggestedTools: this.getSuggestedTools(sceneType)
                });
            }
        }

        return results.sort((a, b) => b.confidence - a.confidence);
    }

    getSuggestedTools(sceneType) {
        const settings = getSettings();
        const tools = [];

        for (const [toolName, toolConfig] of Object.entries(settings.tools)) {
            if (toolConfig.enabled && toolConfig.sceneTypes.includes(sceneType)) {
                tools.push({
                    name: toolName,
                    priority: toolConfig.priority,
                    description: toolConfig.description
                });
            }
        }

        return tools.sort((a, b) => b.priority - a.priority);
    }
}

/**
 * MCP工具管理器 - 客户端版本
 */
class ClientMcpToolManager {
    constructor() {
        this.cache = new Map();
        this.stats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            cacheHits: 0
        };
    }

    async callTool(toolName, functionName, args) {
        const settings = getSettings();
        const toolConfig = settings.tools[toolName];

        if (!toolConfig || !toolConfig.enabled) {
            throw new Error(`Tool ${toolName} is not enabled`);
        }

        const cacheKey = `${toolName}:${functionName}:${JSON.stringify(args)}`;

        // 检查缓存
        if (settings.enableCaching && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < toolConfig.cacheTimeout) {
                this.stats.cacheHits++;
                return cached.result;
            }
        }

        try {
            this.stats.totalCalls++;

            // 模拟MCP工具调用（实际应该调用后端API）
            const result = await this.simulateToolCall(toolName, functionName, args);

            // 缓存结果
            if (settings.enableCaching) {
                this.cache.set(cacheKey, {
                    result: result,
                    timestamp: Date.now()
                });
            }

            this.stats.successfulCalls++;
            return result;

        } catch (error) {
            this.stats.failedCalls++;
            throw error;
        }
    }

    async simulateToolCall(toolName, functionName, args) {
        // 模拟工具调用结果
        return {
            tool: toolName,
            function: functionName,
            args: args,
            result: `模拟${toolName}工具调用结果`,
            timestamp: Date.now()
        };
    }

    getStats() {
        return { ...this.stats };
    }

    clearCache(toolName = null) {
        if (toolName) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${toolName}:`)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
}

/**
 * MCP集成引擎 - 客户端版本
 */
class ClientMcpIntegrationEngine {
    constructor() {
        this.sceneAnalyzer = new ClientSceneAnalyzer();
        this.toolManager = new ClientMcpToolManager();
        this.isEnabled = true;
    }

    async processUserInput(userInput, context = {}) {
        if (!this.isEnabled) return null;

        const settings = getSettings();
        if (!settings.enabled || !settings.autoTrigger) return null;

        try {
            // 场景分析
            const scenes = this.sceneAnalyzer.analyzeScene({
                userInput,
                chatHistory: context.chatHistory || []
            });

            if (scenes.length === 0) return null;

            // 获取最佳场景
            const bestScene = scenes[0];
            if (bestScene.confidence < settings.confidenceThreshold) return null;

            // 调用相关工具
            const results = [];
            const maxTools = Math.min(bestScene.suggestedTools.length, settings.maxToolsPerGeneration);

            for (let i = 0; i < maxTools; i++) {
                const tool = bestScene.suggestedTools[i];
                try {
                    const result = await this.toolManager.callTool(
                        tool.name,
                        'process',
                        { input: userInput, context }
                    );
                    results.push(result);
                } catch (error) {
                    console.warn(`MCP工具调用失败: ${tool.name}`, error);
                }
            }

            return {
                scene: bestScene,
                results: results,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('MCP集成引擎处理失败:', error);
            return null;
        }
    }

    getStats() {
        return {
            toolManager: this.toolManager.getStats(),
            enabled: this.isEnabled,
            settings: getSettings()
        };
    }
}

// jQuery初始化
jQuery(async function() {
    console.log('MCP Integration Plugin: 开始初始化...');

    try {
        // 初始化设置
        initializeSettings();

        // 创建MCP引擎
        mcpEngine = new ClientMcpIntegrationEngine();

        // 初始化设置界面
        await initializeSettingsUI();

        // 监听聊天事件
        eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
        eventSource.on(event_types.MESSAGE_SENT, onMessageSent);
        eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);

        console.log('MCP Integration Plugin: 初始化完成');

    } catch (error) {
        console.error('MCP Integration Plugin: 初始化失败', error);
    }
});

/**
 * 初始化设置界面
 */
async function initializeSettingsUI() {
    // 等待设置界面加载
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if ($('#mcp_integration_enabled').length > 0) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    // 加载设置到界面
    loadSettingsToUI();

    // 绑定事件监听器
    bindSettingsEvents();
}

/**
 * 加载设置到界面
 */
function loadSettingsToUI() {
    const settings = getSettings();

    // 基础设置
    $('#mcp_integration_enabled').prop('checked', settings.enabled);
    $('#mcp_integration_auto_trigger').prop('checked', settings.autoTrigger);
    $('#mcp_confidence_threshold').val(settings.confidenceThreshold);
    $('#mcp_confidence_value').text(settings.confidenceThreshold);
    $('#mcp_max_tools').val(settings.maxToolsPerGeneration);
    $('#mcp_timeout').val(settings.timeoutMs);
    $('#mcp_enable_caching').prop('checked', settings.enableCaching);
    $('#mcp_debug_mode').prop('checked', settings.debugMode);

    // 工具设置
    if (settings.tools) {
        // 天气API
        if (settings.tools['weather-api']) {
            const weather = settings.tools['weather-api'];
            $('#tool_weather_enabled').prop('checked', weather.enabled);
            $('#tool_weather_url').val(weather.serverUrl);
            $('#tool_weather_timeout').val(weather.timeout);
            $('#tool_weather_priority').val(weather.priority);
        }

        // 网络搜索
        if (settings.tools['web-search']) {
            const search = settings.tools['web-search'];
            $('#tool_search_enabled').prop('checked', search.enabled);
            $('#tool_search_url').val(search.serverUrl);
            $('#tool_search_timeout').val(search.timeout);
            $('#tool_search_priority').val(search.priority);
        }

        // 对话记忆
        if (settings.tools['conversation-memory']) {
            const memory = settings.tools['conversation-memory'];
            $('#tool_memory_enabled').prop('checked', memory.enabled);
            $('#tool_memory_url').val(memory.serverUrl);
            $('#tool_memory_timeout').val(memory.timeout);
            $('#tool_memory_priority').val(memory.priority);
        }
    }

    // 更新统计信息
    updateStatsDisplay();
}

/**
 * 绑定设置界面事件
 */
function bindSettingsEvents() {
    // 基础设置事件
    $('#mcp_integration_enabled').on('change', function() {
        updateSettings({ enabled: $(this).prop('checked') });
    });

    $('#mcp_integration_auto_trigger').on('change', function() {
        updateSettings({ autoTrigger: $(this).prop('checked') });
    });

    $('#mcp_confidence_threshold').on('input', function() {
        const value = parseFloat($(this).val());
        $('#mcp_confidence_value').text(value);
        updateSettings({ confidenceThreshold: value });
    });

    $('#mcp_max_tools').on('change', function() {
        updateSettings({ maxToolsPerGeneration: parseInt($(this).val()) });
    });

    $('#mcp_timeout').on('change', function() {
        updateSettings({ timeoutMs: parseInt($(this).val()) });
    });

    $('#mcp_enable_caching').on('change', function() {
        updateSettings({ enableCaching: $(this).prop('checked') });
    });

    $('#mcp_debug_mode').on('change', function() {
        updateSettings({ debugMode: $(this).prop('checked') });
    });

    // 工具设置事件
    bindToolSettingsEvents();

    // 按钮事件
    $('#mcp_clear_cache').on('click', function() {
        if (mcpEngine && mcpEngine.toolManager) {
            mcpEngine.toolManager.clearCache();
            updateStatsDisplay();
            console.log('MCP Integration: 缓存已清理');
        }
    });

    $('#mcp_refresh_stats').on('click', function() {
        updateStatsDisplay();
    });
}

/**
 * 绑定工具设置事件
 */
function bindToolSettingsEvents() {
    // 天气API工具
    $('#tool_weather_enabled').on('change', function() {
        updateToolSetting('weather-api', 'enabled', $(this).prop('checked'));
    });
    $('#tool_weather_url').on('change', function() {
        updateToolSetting('weather-api', 'serverUrl', $(this).val());
    });
    $('#tool_weather_timeout').on('change', function() {
        updateToolSetting('weather-api', 'timeout', parseInt($(this).val()));
    });
    $('#tool_weather_priority').on('change', function() {
        updateToolSetting('weather-api', 'priority', parseFloat($(this).val()));
    });

    // 网络搜索工具
    $('#tool_search_enabled').on('change', function() {
        updateToolSetting('web-search', 'enabled', $(this).prop('checked'));
    });
    $('#tool_search_url').on('change', function() {
        updateToolSetting('web-search', 'serverUrl', $(this).val());
    });
    $('#tool_search_timeout').on('change', function() {
        updateToolSetting('web-search', 'timeout', parseInt($(this).val()));
    });
    $('#tool_search_priority').on('change', function() {
        updateToolSetting('web-search', 'priority', parseFloat($(this).val()));
    });

    // 对话记忆工具
    $('#tool_memory_enabled').on('change', function() {
        updateToolSetting('conversation-memory', 'enabled', $(this).prop('checked'));
    });
    $('#tool_memory_url').on('change', function() {
        updateToolSetting('conversation-memory', 'serverUrl', $(this).val());
    });
    $('#tool_memory_timeout').on('change', function() {
        updateToolSetting('conversation-memory', 'timeout', parseInt($(this).val()));
    });
    $('#tool_memory_priority').on('change', function() {
        updateToolSetting('conversation-memory', 'priority', parseFloat($(this).val()));
    });
}

/**
 * 更新工具设置
 */
function updateToolSetting(toolName, property, value) {
    const settings = getSettings();
    if (!settings.tools[toolName]) {
        settings.tools[toolName] = {};
    }
    settings.tools[toolName][property] = value;
    updateSettings({ tools: settings.tools });
}

/**
 * 更新统计信息显示
 */
function updateStatsDisplay() {
    if (mcpEngine && mcpEngine.toolManager) {
        const stats = mcpEngine.toolManager.getStats();
        $('#mcp_total_calls').text(stats.totalCalls || 0);
        $('#mcp_successful_calls').text(stats.successfulCalls || 0);
        $('#mcp_failed_calls').text(stats.failedCalls || 0);
        $('#mcp_cache_hits').text(stats.cacheHits || 0);
    }
}

/**
 * 事件处理函数
 */
function onChatChanged() {
    if (getSettings().debugMode) {
        console.log('MCP Integration: 聊天已切换');
    }
}

async function onMessageSent() {
    if (!getSettings().enabled || !getSettings().autoTrigger) return;

    try {
        const context = getContext();
        const lastMessage = context.chat[context.chat.length - 1];

        if (lastMessage && lastMessage.is_user) {
            const result = await mcpEngine.processUserInput(lastMessage.mes, {
                chatHistory: context.chat.slice(-5) // 最近5条消息作为上下文
            });

            if (result && getSettings().debugMode) {
                console.log('MCP Integration: 处理结果', result);
            }
        }
    } catch (error) {
        console.error('MCP Integration: 消息处理失败', error);
    }
}

function onGenerationStarted() {
    if (getSettings().debugMode) {
        console.log('MCP Integration: 生成开始');
    }
}
