/**
 * SillyTavern MCP Integration Plugin
 * 智能MCP工具调用插件，在RP生成过程中自动调用相关MCP工具
 */
import fs from "node:fs";
import path from "node:path";
import { McpIntegrationEngine } from "./src/McpIntegrationEngine.js";

// 插件信息
export const info = {
    id: "mcp-integration",
    name: "MCP Integration Plugin",
    description:
        "Intelligently calls MCP tools during RP generation to enhance content with real-time information, memory, and external services",
};

let mcpEngine = null;

/**
 * 插件初始化函数
 * @param {import('express').Router} router Express路由器
 */
export async function init(router) {
    console.log("Initializing MCP Integration Plugin...");

    try {
        // 创建MCP集成引擎
        mcpEngine = new McpIntegrationEngine();

        // 设置API路由
        setupApiRoutes(router);

        // 初始化引擎（异步进行，不阻塞插件加载）
        initializeEngine();

        console.log("MCP Integration Plugin initialized successfully");
    } catch (error) {
        console.error("Failed to initialize MCP Integration Plugin:", error);
        throw error;
    }
}

/**
 * 异步初始化引擎
 */
async function initializeEngine() {
    try {
        await mcpEngine.initialize();
        console.log("MCP Integration Engine is ready");
    } catch (error) {
        console.error("Failed to initialize MCP Integration Engine:", error);
    }
}

/**
 * 设置API路由
 * @param {import('express').Router} router Express路由器
 */
function setupApiRoutes(router) {
    // 获取插件状态
    router.get("/status", (req, res) => {
        try {
            const status = {
                enabled: mcpEngine?.isEnabled || false,
                stats: mcpEngine?.getStats() || {},
                settings: mcpEngine?.settings || {},
                timestamp: Date.now(),
            };
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 获取配置
    router.get("/config", (req, res) => {
        try {
            const configPath = path.join(
                process.cwd(),
                "plugins",
                "mcp-integration",
                "config.json"
            );
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
                res.json(config);
            } else {
                res.json(getDefaultConfig());
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 更新配置
    router.post("/config", (req, res) => {
        try {
            const configPath = path.join(
                process.cwd(),
                "plugins",
                "mcp-integration",
                "config.json"
            );
            const configDir = path.dirname(configPath);

            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 更新设置
    router.post("/settings", (req, res) => {
        try {
            if (mcpEngine) {
                mcpEngine.updateSettings(req.body);
                res.json({ success: true, settings: mcpEngine.settings });
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 启用/禁用插件
    router.post("/toggle", (req, res) => {
        try {
            const { enabled } = req.body;
            if (mcpEngine) {
                mcpEngine.setEnabled(enabled);
                res.json({ success: true, enabled: mcpEngine.isEnabled });
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 获取可用工具列表
    router.get("/tools", async (req, res) => {
        try {
            if (mcpEngine && mcpEngine.toolManager) {
                const tools = mcpEngine.toolManager.getAvailableTools();
                res.json(tools);
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 检查工具健康状态
    router.get("/tools/health", async (req, res) => {
        try {
            if (mcpEngine && mcpEngine.toolManager) {
                const health = await mcpEngine.toolManager.checkHealth();
                res.json(health);
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 手动测试工具调用
    router.post("/tools/test", async (req, res) => {
        try {
            const { toolName, function: functionName, args } = req.body;

            if (!mcpEngine || !mcpEngine.toolManager) {
                return res
                    .status(503)
                    .json({ error: "MCP Engine not initialized" });
            }

            const result = await mcpEngine.toolManager.callTool(
                toolName,
                functionName,
                args
            );
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 手动场景分析
    router.post("/analyze", async (req, res) => {
        try {
            const { text, context } = req.body;

            if (!mcpEngine || !mcpEngine.sceneAnalyzer) {
                return res
                    .status(503)
                    .json({ error: "MCP Engine not initialized" });
            }

            const analysisContext = {
                userInput: text,
                ...context,
            };

            const analysis = await mcpEngine.sceneAnalyzer.analyzeScene(
                analysisContext
            );
            res.json(analysis);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 清理缓存
    router.post("/cache/clear", (req, res) => {
        try {
            const { toolName } = req.body;

            if (mcpEngine && mcpEngine.toolManager) {
                mcpEngine.toolManager.clearCache(toolName);
                res.json({ success: true });
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 获取统计信息
    router.get("/stats", (req, res) => {
        try {
            if (mcpEngine) {
                const stats = mcpEngine.getStats();
                res.json(stats);
            } else {
                res.status(503).json({ error: "MCP Engine not initialized" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

/**
 * 获取默认配置
 */
function getDefaultConfig() {
    return {
        version: "1.0.0",
        settings: {
            autoTrigger: true,
            maxToolsPerGeneration: 3,
            timeoutMs: 8000,
            confidenceThreshold: 0.4,
            enableCaching: true,
            debugMode: false,
        },
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
            },
            "rag-search": {
                enabled: false,
                serverUrl: "http://localhost:3004/mcp",
                timeout: 8000,
                maxRetries: 2,
                cacheTimeout: 600000,
                priority: 0.8,
                sceneTypes: ["search", "memory"],
                description: "RAG文档搜索",
            },
            "maps-api": {
                enabled: false,
                serverUrl: "http://localhost:3005/mcp",
                timeout: 6000,
                maxRetries: 2,
                cacheTimeout: 900000,
                priority: 0.9,
                sceneTypes: ["location"],
                description: "地图和位置服务",
            },
            "physics-engine": {
                enabled: false,
                serverUrl: "http://localhost:3006/mcp",
                timeout: 5000,
                maxRetries: 2,
                cacheTimeout: 300000,
                priority: 1,
                sceneTypes: ["physical_interaction"],
                description: "物理交互模拟引擎",
            },
            "emotion-analyzer": {
                enabled: false,
                serverUrl: "http://localhost:3007/mcp",
                timeout: 4000,
                maxRetries: 2,
                cacheTimeout: 600000,
                priority: 1,
                sceneTypes: ["emotional_state"],
                description: "情感状态分析器",
            },
            "relationship-tracker": {
                enabled: false,
                serverUrl: "http://localhost:3008/mcp",
                timeout: 5000,
                maxRetries: 2,
                cacheTimeout: 900000,
                priority: 1,
                sceneTypes: ["relationship"],
                description: "角色关系追踪器",
            },
            "github-mcp": {
                enabled: false,
                serverUrl: "docker://ghcr.io/github/github-mcp-server",
                timeout: 10000,
                maxRetries: 2,
                cacheTimeout: 600000,
                priority: 0.9,
                sceneTypes: ["search", "memory"],
                description: "GitHub MCP服务器 - 代码搜索和仓库管理",
                dockerConfig: {
                    image: "ghcr.io/github/github-mcp-server",
                    env: {
                        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}",
                        "GITHUB_TOOLSETS": "repos,issues,pull_requests,users"
                    },
                    args: ["stdio"]
                }
            },
        },
    };
}

/**
 * 插件退出函数
 */
export async function exit() {
    console.log("Shutting down MCP Integration Plugin...");

    try {
        if (mcpEngine) {
            await mcpEngine.cleanup();
            mcpEngine = null;
        }
        console.log("MCP Integration Plugin shut down successfully");
    } catch (error) {
        console.error("Error during MCP Integration Plugin shutdown:", error);
    }
}
