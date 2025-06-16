/**
 * MCP工具管理器
 * 负责管理所有MCP工具的连接、配置和调用
 */
export class McpToolManager {
    constructor() {
        this.tools = new Map();           // 已注册的工具
        this.connections = new Map();     // MCP服务连接
        this.config = new Map();          // 工具配置
        this.cache = new Map();           // 结果缓存
        this.isInitialized = false;
    }

    /**
     * 初始化工具管理器
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.loadConfiguration();
            await this.connectToServices();
            await this.registerBuiltinTools();
            this.isInitialized = true;
            console.log('MCP Tool Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MCP Tool Manager:', error);
            throw error;
        }
    }

    /**
     * 加载配置
     */
    async loadConfiguration() {
        try {
            const response = await fetch('/api/plugins/mcp-integration/config');
            if (response.ok) {
                const config = await response.json();
                this.applyConfiguration(config);
            }
        } catch (error) {
            console.warn('Failed to load MCP configuration, using defaults:', error);
            this.applyDefaultConfiguration();
        }
    }

    /**
     * 应用配置
     */
    applyConfiguration(config) {
        for (const [toolName, toolConfig] of Object.entries(config.tools || {})) {
            this.config.set(toolName, {
                enabled: toolConfig.enabled || false,
                serverUrl: toolConfig.serverUrl,
                timeout: toolConfig.timeout || 5000,
                maxRetries: toolConfig.maxRetries || 2,
                cacheTimeout: toolConfig.cacheTimeout || 300000, // 5分钟
                priority: toolConfig.priority || 1,
                sceneTypes: toolConfig.sceneTypes || [],
                ...toolConfig
            });
        }
    }

    /**
     * 应用默认配置
     */
    applyDefaultConfiguration() {
        const defaultTools = {
            'weather-api': {
                enabled: false,
                serverUrl: 'http://localhost:3001/mcp',
                sceneTypes: ['weather'],
                priority: 1
            },
            'web-search': {
                enabled: false,
                serverUrl: 'http://localhost:3002/mcp',
                sceneTypes: ['search'],
                priority: 0.9
            },
            'conversation-memory': {
                enabled: false,
                serverUrl: 'http://localhost:3003/mcp',
                sceneTypes: ['memory'],
                priority: 1
            },
            'rag-search': {
                enabled: false,
                serverUrl: 'http://localhost:3004/mcp',
                sceneTypes: ['search', 'memory'],
                priority: 0.8
            }
        };

        this.applyConfiguration({ tools: defaultTools });
    }

    /**
     * 连接到MCP服务
     */
    async connectToServices() {
        const connectionPromises = [];

        for (const [toolName, config] of this.config) {
            if (config.enabled && config.serverUrl) {
                connectionPromises.push(this.connectToService(toolName, config));
            }
        }

        const results = await Promise.allSettled(connectionPromises);
        
        let successCount = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
            } else {
                const toolName = Array.from(this.config.keys())[index];
                console.warn(`Failed to connect to MCP service for ${toolName}:`, result.reason);
            }
        });

        console.log(`Connected to ${successCount}/${connectionPromises.length} MCP services`);
    }

    /**
     * 连接到单个MCP服务
     */
    async connectToService(toolName, config) {
        try {
            const connection = new McpConnection(config.serverUrl, {
                timeout: config.timeout,
                maxRetries: config.maxRetries
            });

            await connection.initialize();
            
            // 获取工具列表
            const tools = await connection.listTools();
            
            this.connections.set(toolName, connection);
            this.tools.set(toolName, {
                connection,
                config,
                tools,
                lastConnected: Date.now()
            });

            console.log(`Connected to MCP service: ${toolName} (${tools.length} tools available)`);
            return connection;
        } catch (error) {
            console.error(`Failed to connect to MCP service ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * 注册内置工具
     */
    async registerBuiltinTools() {
        // 注册一些内置的简单工具
        this.registerTool('datetime-service', {
            name: 'datetime-service',
            description: '获取当前日期时间',
            inputSchema: {},
            handler: async () => {
                return {
                    currentTime: new Date().toISOString(),
                    timestamp: Date.now(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                };
            }
        });

        this.registerTool('browser-info', {
            name: 'browser-info',
            description: '获取浏览器信息',
            inputSchema: {},
            handler: async () => {
                return {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    platform: navigator.platform,
                    cookieEnabled: navigator.cookieEnabled
                };
            }
        });
    }

    /**
     * 注册工具
     */
    registerTool(name, toolDefinition) {
        if (!this.tools.has(name)) {
            this.tools.set(name, {
                config: { enabled: true, priority: 1 },
                tools: [toolDefinition],
                isBuiltin: true
            });
        }
    }

    /**
     * 调用MCP工具
     */
    async callTool(toolName, toolFunction, args = {}) {
        const cacheKey = `${toolName}:${toolFunction}:${JSON.stringify(args)}`;
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < (this.config.get(toolName)?.cacheTimeout || 300000)) {
                console.log(`Using cached result for ${toolName}:${toolFunction}`);
                return cached.result;
            }
        }

        try {
            const toolInfo = this.tools.get(toolName);
            if (!toolInfo) {
                throw new Error(`Tool ${toolName} not found`);
            }

            if (!toolInfo.config.enabled) {
                throw new Error(`Tool ${toolName} is disabled`);
            }

            let result;

            if (toolInfo.isBuiltin) {
                // 调用内置工具
                const tool = toolInfo.tools.find(t => t.name === toolFunction);
                if (!tool) {
                    throw new Error(`Function ${toolFunction} not found in tool ${toolName}`);
                }
                result = await tool.handler(args);
            } else {
                // 调用MCP服务
                const connection = toolInfo.connection;
                if (!connection) {
                    throw new Error(`No connection available for tool ${toolName}`);
                }
                result = await connection.callTool(toolFunction, args);
            }

            // 缓存结果
            this.cache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            console.error(`Error calling tool ${toolName}:${toolFunction}:`, error);
            throw error;
        }
    }

    /**
     * 批量调用工具
     */
    async callTools(toolCalls) {
        const promises = toolCalls.map(async (call) => {
            try {
                const result = await this.callTool(call.toolName, call.function, call.args);
                return {
                    toolName: call.toolName,
                    function: call.function,
                    success: true,
                    result,
                    executionTime: Date.now() - call.startTime
                };
            } catch (error) {
                return {
                    toolName: call.toolName,
                    function: call.function,
                    success: false,
                    error: error.message,
                    executionTime: Date.now() - call.startTime
                };
            }
        });

        return await Promise.allSettled(promises);
    }

    /**
     * 获取可用工具列表
     */
    getAvailableTools(sceneType = null) {
        const availableTools = [];

        for (const [toolName, toolInfo] of this.tools) {
            if (!toolInfo.config.enabled) continue;

            if (sceneType && toolInfo.config.sceneTypes) {
                if (!toolInfo.config.sceneTypes.includes(sceneType)) continue;
            }

            availableTools.push({
                name: toolName,
                priority: toolInfo.config.priority,
                sceneTypes: toolInfo.config.sceneTypes || [],
                tools: toolInfo.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema
                }))
            });
        }

        return availableTools.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 检查工具健康状态
     */
    async checkHealth() {
        const healthStatus = {};

        for (const [toolName, toolInfo] of this.tools) {
            try {
                if (toolInfo.isBuiltin) {
                    healthStatus[toolName] = { status: 'healthy', type: 'builtin' };
                } else if (toolInfo.connection) {
                    await toolInfo.connection.ping();
                    healthStatus[toolName] = { 
                        status: 'healthy', 
                        type: 'mcp',
                        lastConnected: toolInfo.lastConnected
                    };
                } else {
                    healthStatus[toolName] = { status: 'disconnected', type: 'mcp' };
                }
            } catch (error) {
                healthStatus[toolName] = { 
                    status: 'error', 
                    error: error.message,
                    type: toolInfo.isBuiltin ? 'builtin' : 'mcp'
                };
            }
        }

        return healthStatus;
    }

    /**
     * 清理缓存
     */
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

    /**
     * 断开连接
     */
    async disconnect() {
        for (const [toolName, connection] of this.connections) {
            try {
                await connection.close();
                console.log(`Disconnected from MCP service: ${toolName}`);
            } catch (error) {
                console.warn(`Error disconnecting from ${toolName}:`, error);
            }
        }
        
        this.connections.clear();
        this.tools.clear();
        this.cache.clear();
        this.isInitialized = false;
    }
}

/**
 * MCP连接类
 */
class McpConnection {
    constructor(serverUrl, options = {}) {
        this.serverUrl = serverUrl;
        this.timeout = options.timeout || 5000;
        this.maxRetries = options.maxRetries || 2;
        this.isConnected = false;
    }

    async initialize() {
        const response = await this.request('/initialize', {
            method: 'POST',
            body: JSON.stringify({
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: { listChanged: true },
                    resources: { subscribe: true, listChanged: true }
                }
            })
        });

        this.isConnected = true;
        return response;
    }

    async listTools() {
        return await this.request('/tools/list');
    }

    async callTool(name, args) {
        return await this.request('/tools/call', {
            method: 'POST',
            body: JSON.stringify({ name, arguments: args })
        });
    }

    async ping() {
        return await this.request('/ping');
    }

    async request(endpoint, options = {}) {
        const url = `${this.serverUrl}${endpoint}`;
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.timeout,
            ...options
        };

        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                lastError = error;
                if (attempt < this.maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        throw lastError;
    }

    async close() {
        this.isConnected = false;
    }
}
