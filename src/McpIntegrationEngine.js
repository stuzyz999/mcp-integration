/**
 * MCP集成引擎
 * 核心组件，负责在RP生成过程中智能调用MCP工具
 */
import { SceneAnalyzer } from './SceneAnalyzer.js';
import { McpToolManager } from './McpToolManager.js';

export class McpIntegrationEngine {
    constructor() {
        this.sceneAnalyzer = new SceneAnalyzer();
        this.toolManager = new McpToolManager();
        this.isEnabled = false;
        this.settings = {
            autoTrigger: true,
            maxToolsPerGeneration: 3,
            timeoutMs: 8000,
            confidenceThreshold: 0.4,
            enableCaching: true,
            debugMode: false
        };
        this.stats = {
            totalGenerations: 0,
            toolCallsTriggered: 0,
            successfulCalls: 0,
            failedCalls: 0
        };
    }

    /**
     * 初始化集成引擎
     */
    async initialize() {
        try {
            await this.toolManager.initialize();
            this.isEnabled = true;
            console.log('MCP Integration Engine initialized successfully');
            
            // 注册事件监听器
            this.registerEventListeners();
        } catch (error) {
            console.error('Failed to initialize MCP Integration Engine:', error);
            this.isEnabled = false;
        }
    }

    /**
     * 注册SillyTavern事件监听器
     */
    registerEventListeners() {
        // 监听生成开始事件 - 主要的MCP工具调用时机
        if (typeof eventSource !== 'undefined') {
            eventSource.on('generation_started', this.onGenerationStarted.bind(this));
            eventSource.on('GENERATE_BEFORE_COMBINE_PROMPTS', this.onBeforeCombinePrompts.bind(this));
        }
    }

    /**
     * 处理生成开始事件
     */
    async onGenerationStarted(type, params, isDryRun) {
        if (!this.isEnabled || isDryRun || !this.settings.autoTrigger) {
            return;
        }

        // 跳过某些生成类型
        if (['quiet', 'impersonate'].includes(type)) {
            return;
        }

        this.stats.totalGenerations++;

        try {
            const context = await this.buildAnalysisContext();
            const analysis = await this.sceneAnalyzer.analyzeScene(context);
            
            if (this.settings.debugMode) {
                console.log('MCP Scene Analysis:', analysis);
            }

            if (analysis.confidence >= this.settings.confidenceThreshold) {
                await this.executeToolCalls(analysis, context);
            }
        } catch (error) {
            console.error('Error in MCP generation handler:', error);
        }
    }

    /**
     * 处理提示词组合前事件
     */
    async onBeforeCombinePrompts(data) {
        if (!this.isEnabled || !data.mcpEnhancement) {
            return;
        }

        // 将MCP工具结果注入到提示词中
        const enhancement = this.formatMcpEnhancement(data.mcpEnhancement);
        if (enhancement) {
            data.mcpContext = enhancement;
        }
    }

    /**
     * 构建分析上下文
     */
    async buildAnalysisContext() {
        const context = {};

        try {
            // 获取用户输入
            const sendTextarea = document.getElementById('send_textarea');
            if (sendTextarea) {
                context.userInput = sendTextarea.value;
            }

            // 获取聊天历史
            if (typeof chat !== 'undefined' && Array.isArray(chat)) {
                context.chatHistory = chat.slice(-10); // 最近10条消息
            }

            // 获取角色信息
            if (typeof characters !== 'undefined' && typeof this_chid !== 'undefined') {
                const character = characters[this_chid];
                if (character) {
                    context.characterInfo = {
                        name: character.name,
                        description: character.description,
                        personality: character.personality,
                        scenario: character.scenario,
                        first_mes: character.first_mes
                    };
                }
            }

            // 获取群组信息
            if (typeof selected_group !== 'undefined' && selected_group) {
                context.isGroupChat = true;
                context.groupId = selected_group;
            }

            // 获取时间上下文
            context.timeContext = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            return context;
        } catch (error) {
            console.error('Error building analysis context:', error);
            return {};
        }
    }

    /**
     * 执行工具调用
     */
    async executeToolCalls(analysis, context) {
        const { recommendedTools } = analysis;
        
        if (!recommendedTools || recommendedTools.length === 0) {
            return;
        }

        // 限制工具数量
        const toolsToCall = recommendedTools
            .slice(0, this.settings.maxToolsPerGeneration)
            .filter(tool => tool.finalPriority > 0.3);

        if (toolsToCall.length === 0) {
            return;
        }

        this.stats.toolCallsTriggered++;

        const toolCalls = toolsToCall.map(tool => ({
            toolName: tool.name,
            function: this.selectToolFunction(tool, analysis.detectedScenes),
            args: this.buildToolArguments(tool, context, analysis),
            startTime: Date.now()
        }));

        try {
            const results = await Promise.race([
                this.toolManager.callTools(toolCalls),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Tool calls timeout')), this.settings.timeoutMs)
                )
            ]);

            const processedResults = this.processToolResults(results, analysis);
            
            // 将结果存储到全局上下文中，供后续的提示词组合使用
            if (typeof window !== 'undefined') {
                window.mcpEnhancement = processedResults;
            }

            this.updateStats(results);

            if (this.settings.debugMode) {
                console.log('MCP Tool Results:', processedResults);
            }

        } catch (error) {
            console.error('Error executing MCP tool calls:', error);
            this.stats.failedCalls++;
        }
    }

    /**
     * 选择工具函数
     */
    selectToolFunction(tool, detectedScenes) {
        // 根据场景类型选择合适的工具函数
        const functionMappings = {
            'weather-api': {
                weather: 'getCurrentWeather'
            },
            'web-search': {
                search: 'searchWeb'
            },
            'conversation-memory': {
                memory: 'searchMemory'
            },
            'rag-search': {
                search: 'searchDocuments',
                memory: 'searchMemory'
            },
            'maps-api': {
                location: 'searchPlaces'
            },
            'datetime-service': {
                time: 'datetime-service'
            }
        };

        const toolFunctions = functionMappings[tool.name];
        if (!toolFunctions) {
            return tool.name; // 默认使用工具名作为函数名
        }

        // 根据检测到的场景选择最合适的函数
        for (const scene of detectedScenes) {
            if (toolFunctions[scene.type]) {
                return toolFunctions[scene.type];
            }
        }

        // 返回第一个可用函数
        return Object.values(toolFunctions)[0] || tool.name;
    }

    /**
     * 构建工具参数
     */
    buildToolArguments(tool, context, analysis) {
        const args = {};

        // 基础参数
        if (context.userInput) {
            args.query = context.userInput;
        }

        if (context.characterInfo) {
            args.character = context.characterInfo.name;
            args.context = `Character: ${context.characterInfo.name}. ${context.characterInfo.description || ''}`;
        }

        // 根据工具类型添加特定参数
        switch (tool.name) {
            case 'weather-api':
                if (context.characterInfo?.scenario) {
                    args.location = this.extractLocationFromText(context.characterInfo.scenario);
                }
                break;

            case 'web-search':
                args.maxResults = 3;
                args.safeSearch = true;
                break;

            case 'conversation-memory':
                if (context.chatHistory) {
                    args.recentMessages = context.chatHistory.slice(-5);
                }
                break;

            case 'rag-search':
                args.maxResults = 5;
                if (context.characterInfo) {
                    args.context = context.characterInfo.description;
                }
                break;
        }

        return args;
    }

    /**
     * 处理工具结果
     */
    processToolResults(results, analysis) {
        const processedResults = {
            timestamp: Date.now(),
            sceneAnalysis: analysis,
            toolResults: [],
            summary: ''
        };

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                processedResults.toolResults.push({
                    toolName: result.value.toolName,
                    function: result.value.function,
                    result: result.value.result,
                    executionTime: result.value.executionTime
                });
            }
        }

        // 生成结果摘要
        processedResults.summary = this.generateResultSummary(processedResults.toolResults);

        return processedResults;
    }

    /**
     * 生成结果摘要
     */
    generateResultSummary(toolResults) {
        if (toolResults.length === 0) {
            return '';
        }

        const summaryParts = [];

        for (const result of toolResults) {
            switch (result.toolName) {
                case 'weather-api':
                    if (result.result.weather) {
                        summaryParts.push(`当前天气：${result.result.weather.description}，温度${result.result.weather.temperature}°C`);
                    }
                    break;

                case 'web-search':
                    if (result.result.results && result.result.results.length > 0) {
                        summaryParts.push(`搜索到${result.result.results.length}条相关信息`);
                    }
                    break;

                case 'conversation-memory':
                    if (result.result.memories && result.result.memories.length > 0) {
                        summaryParts.push(`找到${result.result.memories.length}条相关记忆`);
                    }
                    break;

                case 'datetime-service':
                    if (result.result.currentTime) {
                        const time = new Date(result.result.currentTime);
                        summaryParts.push(`当前时间：${time.toLocaleString()}`);
                    }
                    break;
            }
        }

        return summaryParts.join('；');
    }

    /**
     * 格式化MCP增强内容
     */
    formatMcpEnhancement(enhancement) {
        if (!enhancement || !enhancement.toolResults || enhancement.toolResults.length === 0) {
            return null;
        }

        let formattedContent = '\n[系统信息 - 来自MCP工具]\n';
        
        for (const result of enhancement.toolResults) {
            formattedContent += `- ${result.toolName}: ${JSON.stringify(result.result)}\n`;
        }

        if (enhancement.summary) {
            formattedContent += `摘要：${enhancement.summary}\n`;
        }

        formattedContent += '[/系统信息]\n';

        return formattedContent;
    }

    /**
     * 从文本中提取位置信息
     */
    extractLocationFromText(text) {
        // 简单的位置提取逻辑
        const locationPatterns = [
            /在(.+?)(?:市|县|区|镇|村)/,
            /位于(.+?)(?:的|，|。)/,
            /(.+?)(?:街|路|大道|广场)/
        ];

        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * 更新统计信息
     */
    updateStats(results) {
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                this.stats.successfulCalls++;
            } else {
                this.stats.failedCalls++;
            }
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.toolCallsTriggered > 0 
                ? (this.stats.successfulCalls / this.stats.toolCallsTriggered * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * 更新设置
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * 启用/禁用引擎
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * 清理资源
     */
    async cleanup() {
        await this.toolManager.disconnect();
        this.isEnabled = false;
    }
}
