/**
 * 智能场景识别引擎
 * 分析当前RP上下文，自动判断需要调用哪些MCP工具
 */
export class SceneAnalyzer {
    constructor() {
        this.scenePatterns = new Map();
        this.toolMappings = new Map();
        this.initializePatterns();
    }

    /**
     * 初始化场景识别模式
     */
    initializePatterns() {
        // 天气相关场景
        this.scenePatterns.set("weather", {
            keywords: [
                "天气",
                "下雨",
                "晴天",
                "阴天",
                "温度",
                "气温",
                "风",
                "雪",
                "雾",
            ],
            patterns: [
                /今天.*?天气/i,
                /外面.*?(下雨|晴天|阴天)/i,
                /温度.*?(高|低|热|冷)/i,
                /看.*?(天空|云|太阳)/i,
            ],
            contextClues: [
                "outdoor",
                "outside",
                "weather",
                "temperature",
                "rain",
                "sunny",
            ],
        });

        // 位置/地理相关场景
        this.scenePatterns.set("location", {
            keywords: ["地址", "位置", "在哪", "去哪", "路线", "导航", "附近"],
            patterns: [
                /在.*?(哪里|什么地方)/i,
                /去.*?(商店|餐厅|医院|学校)/i,
                /附近.*?(有什么|哪里有)/i,
                /怎么.*?去/i,
            ],
            contextClues: ["location", "address", "nearby", "direction", "map"],
        });

        // 时间相关场景
        this.scenePatterns.set("time", {
            keywords: ["时间", "几点", "什么时候", "日期", "星期", "月份"],
            patterns: [
                /现在.*?几点/i,
                /今天.*?(星期|日期)/i,
                /什么时候.*?(开始|结束)/i,
            ],
            contextClues: ["time", "date", "schedule", "when"],
        });

        // 记忆/历史相关场景
        this.scenePatterns.set("memory", {
            keywords: ["记得", "想起", "以前", "之前", "历史", "过去"],
            patterns: [
                /还记得.*?吗/i,
                /以前.*?(说过|做过)/i,
                /我们.*?(聊过|谈过)/i,
                /上次.*?(见面|对话)/i,
            ],
            contextClues: [
                "remember",
                "recall",
                "history",
                "previous",
                "before",
            ],
        });

        // 搜索/信息查询场景
        this.scenePatterns.set("search", {
            keywords: ["搜索", "查找", "了解", "知道", "信息", "资料"],
            patterns: [
                /搜索.*?(关于|有关)/i,
                /查找.*?(信息|资料)/i,
                /了解.*?(更多|详细)/i,
                /告诉我.*?(关于|有关)/i,
            ],
            contextClues: ["search", "find", "information", "learn", "know"],
        });

        // 购物/商品相关场景
        this.scenePatterns.set("shopping", {
            keywords: ["买", "购买", "价格", "商品", "店铺", "优惠"],
            patterns: [
                /想.*?买/i,
                /价格.*?(多少|便宜|贵)/i,
                /哪里.*?(有卖|能买)/i,
                /推荐.*?(商品|店铺)/i,
            ],
            contextClues: ["buy", "purchase", "price", "shop", "store"],
        });

        // 物理交互场景 (成人内容)
        this.scenePatterns.set("physical_interaction", {
            keywords: ["触摸", "拥抱", "亲吻", "身体", "肌肤", "温度", "心跳"],
            patterns: [
                /感受.*?(温暖|柔软|心跳)/i,
                /(触摸|抚摸|拥抱).*?(轻柔|温柔)/i,
                /身体.*?(贴近|接触|感觉)/i,
                /(呼吸|心跳).*?(加快|急促)/i,
            ],
            contextClues: [
                "touch",
                "embrace",
                "physical",
                "intimate",
                "gentle",
                "warm",
            ],
        });

        // 情感状态场景
        this.scenePatterns.set("emotional_state", {
            keywords: [
                "情绪",
                "感情",
                "心情",
                "开心",
                "难过",
                "愤怒",
                "紧张",
                "兴奋",
            ],
            patterns: [
                /感到.*?(开心|难过|愤怒|紧张|兴奋)/i,
                /心情.*?(好|不好|复杂)/i,
                /情绪.*?(波动|变化|激动)/i,
                /(高兴|沮丧|焦虑|平静).*?了/i,
            ],
            contextClues: [
                "emotion",
                "feeling",
                "mood",
                "happy",
                "sad",
                "angry",
                "excited",
            ],
        });

        // 角色关系场景
        this.scenePatterns.set("relationship", {
            keywords: ["关系", "朋友", "恋人", "伙伴", "信任", "依赖", "亲密"],
            patterns: [
                /我们.*?(关系|感情)/i,
                /(信任|依赖|喜欢).*?你/i,
                /你.*?(对我|感觉)/i,
                /(朋友|恋人|伙伴).*?关系/i,
            ],
            contextClues: [
                "relationship",
                "trust",
                "intimate",
                "partner",
                "friend",
                "lover",
            ],
        });
    }

    /**
     * 分析当前场景并返回推荐的MCP工具
     * @param {Object} context - 分析上下文
     * @returns {Array} 推荐的MCP工具列表
     */
    async analyzeScene(context) {
        const {
            userInput, // 用户当前输入
            chatHistory, // 聊天历史
            characterInfo, // 角色信息
            currentLocation, // 当前位置设定
            timeContext, // 时间上下文
        } = context;

        const detectedScenes = [];
        const recommendedTools = [];

        // 分析用户输入
        if (userInput) {
            const inputScenes = this.analyzeText(userInput);
            detectedScenes.push(...inputScenes);
        }

        // 分析最近的聊天历史
        if (chatHistory && chatHistory.length > 0) {
            const recentMessages = chatHistory.slice(-5); // 分析最近5条消息
            for (const message of recentMessages) {
                const messageScenes = this.analyzeText(
                    message.mes || message.content
                );
                detectedScenes.push(...messageScenes);
            }
        }

        // 分析角色设定中的场景线索
        if (characterInfo) {
            const characterScenes = this.analyzeCharacterContext(characterInfo);
            detectedScenes.push(...characterScenes);
        }

        // 去重并按置信度排序
        const uniqueScenes = this.deduplicateAndRank(detectedScenes);

        // 根据检测到的场景推荐MCP工具
        for (const scene of uniqueScenes) {
            const tools = this.getToolsForScene(scene);
            recommendedTools.push(...tools);
        }

        return {
            detectedScenes: uniqueScenes,
            recommendedTools: this.prioritizeTools(recommendedTools),
            confidence: this.calculateOverallConfidence(uniqueScenes),
        };
    }

    /**
     * 分析文本内容识别场景
     * @param {string} text - 要分析的文本
     * @returns {Array} 检测到的场景
     */
    analyzeText(text) {
        if (!text || typeof text !== "string") return [];

        const detectedScenes = [];
        const lowerText = text.toLowerCase();

        for (const [sceneType, config] of this.scenePatterns) {
            let confidence = 0;
            const matches = [];

            // 关键词匹配
            for (const keyword of config.keywords) {
                if (lowerText.includes(keyword)) {
                    confidence += 0.3;
                    matches.push({ type: "keyword", value: keyword });
                }
            }

            // 正则模式匹配
            for (const pattern of config.patterns) {
                if (pattern.test(text)) {
                    confidence += 0.5;
                    matches.push({ type: "pattern", value: pattern.source });
                }
            }

            // 上下文线索匹配
            for (const clue of config.contextClues) {
                if (lowerText.includes(clue)) {
                    confidence += 0.2;
                    matches.push({ type: "context", value: clue });
                }
            }

            if (confidence > 0.3) {
                // 置信度阈值
                detectedScenes.push({
                    type: sceneType,
                    confidence: Math.min(confidence, 1.0),
                    matches: matches,
                    source: "text_analysis",
                });
            }
        }

        return detectedScenes;
    }

    /**
     * 分析角色设定中的场景线索
     * @param {Object} characterInfo - 角色信息
     * @returns {Array} 检测到的场景
     */
    analyzeCharacterContext(characterInfo) {
        const scenes = [];

        // 分析角色描述
        if (characterInfo.description) {
            scenes.push(...this.analyzeText(characterInfo.description));
        }

        // 分析角色设定场景
        if (characterInfo.scenario) {
            scenes.push(...this.analyzeText(characterInfo.scenario));
        }

        // 分析角色个性中的场景倾向
        if (characterInfo.personality) {
            const personalityScenes = this.analyzeText(
                characterInfo.personality
            );
            scenes.push(
                ...personalityScenes.map((scene) => ({
                    ...scene,
                    source: "character_personality",
                    confidence: scene.confidence * 0.7, // 降低权重
                }))
            );
        }

        return scenes;
    }

    /**
     * 去重并按置信度排序
     * @param {Array} scenes - 检测到的场景列表
     * @returns {Array} 去重排序后的场景
     */
    deduplicateAndRank(scenes) {
        const sceneMap = new Map();

        for (const scene of scenes) {
            const key = scene.type;
            if (sceneMap.has(key)) {
                const existing = sceneMap.get(key);
                // 合并置信度和匹配信息
                existing.confidence = Math.max(
                    existing.confidence,
                    scene.confidence
                );
                existing.matches.push(...scene.matches);
            } else {
                sceneMap.set(key, { ...scene });
            }
        }

        return Array.from(sceneMap.values()).sort(
            (a, b) => b.confidence - a.confidence
        );
    }

    /**
     * 根据场景获取推荐的MCP工具
     * @param {Object} scene - 检测到的场景
     * @returns {Array} 推荐的工具列表
     */
    getToolsForScene(scene) {
        const toolMappings = {
            weather: [
                {
                    name: "weather-api",
                    priority: 1,
                    reason: "获取实时天气信息",
                },
                {
                    name: "location-service",
                    priority: 0.8,
                    reason: "确定天气查询位置",
                },
            ],
            location: [
                { name: "maps-api", priority: 1, reason: "提供地图和位置信息" },
                { name: "places-api", priority: 0.9, reason: "查找附近地点" },
                {
                    name: "directions-api",
                    priority: 0.8,
                    reason: "提供路线导航",
                },
            ],
            time: [
                {
                    name: "datetime-service",
                    priority: 1,
                    reason: "获取准确时间信息",
                },
                { name: "calendar-api", priority: 0.7, reason: "查询日程安排" },
            ],
            memory: [
                {
                    name: "conversation-memory",
                    priority: 1,
                    reason: "检索历史对话",
                },
                {
                    name: "character-memory",
                    priority: 0.9,
                    reason: "回忆角色相关信息",
                },
                {
                    name: "rag-search",
                    priority: 0.8,
                    reason: "搜索相关记忆片段",
                },
            ],
            search: [
                { name: "web-search", priority: 1, reason: "搜索网络信息" },
                { name: "knowledge-base", priority: 0.9, reason: "查询知识库" },
                { name: "rag-search", priority: 0.8, reason: "检索相关文档" },
            ],
            shopping: [
                { name: "product-search", priority: 1, reason: "搜索商品信息" },
                { name: "price-comparison", priority: 0.9, reason: "比较价格" },
                {
                    name: "store-locator",
                    priority: 0.7,
                    reason: "查找附近商店",
                },
            ],
            physical_interaction: [
                { name: "physics-engine", priority: 1, reason: "物理交互模拟" },
                { name: "anatomy-guide", priority: 0.9, reason: "解剖学指导" },
                { name: "sensation-mapper", priority: 0.8, reason: "感觉映射" },
                {
                    name: "interaction-validator",
                    priority: 0.7,
                    reason: "交互验证",
                },
            ],
            emotional_state: [
                { name: "emotion-analyzer", priority: 1, reason: "情感分析" },
                { name: "mood-tracker", priority: 0.9, reason: "情绪追踪" },
                { name: "empathy-engine", priority: 0.8, reason: "共情引擎" },
                { name: "emotional-memory", priority: 0.7, reason: "情感记忆" },
            ],
            relationship: [
                {
                    name: "relationship-tracker",
                    priority: 1,
                    reason: "关系追踪",
                },
                { name: "intimacy-meter", priority: 0.9, reason: "亲密度计算" },
                { name: "trust-analyzer", priority: 0.8, reason: "信任度分析" },
                {
                    name: "compatibility-checker",
                    priority: 0.7,
                    reason: "兼容性检查",
                },
            ],
        };

        const tools = toolMappings[scene.type] || [];
        return tools.map((tool) => ({
            ...tool,
            sceneType: scene.type,
            sceneConfidence: scene.confidence,
            finalPriority: tool.priority * scene.confidence,
        }));
    }

    /**
     * 优化工具优先级排序
     * @param {Array} tools - 工具列表
     * @returns {Array} 排序后的工具列表
     */
    prioritizeTools(tools) {
        // 去重
        const toolMap = new Map();
        for (const tool of tools) {
            const key = tool.name;
            if (toolMap.has(key)) {
                const existing = toolMap.get(key);
                if (tool.finalPriority > existing.finalPriority) {
                    toolMap.set(key, tool);
                }
            } else {
                toolMap.set(key, tool);
            }
        }

        // 按最终优先级排序
        return Array.from(toolMap.values())
            .sort((a, b) => b.finalPriority - a.finalPriority)
            .slice(0, 5); // 限制最多5个工具
    }

    /**
     * 计算整体置信度
     * @param {Array} scenes - 场景列表
     * @returns {number} 整体置信度
     */
    calculateOverallConfidence(scenes) {
        if (scenes.length === 0) return 0;

        const totalConfidence = scenes.reduce(
            (sum, scene) => sum + scene.confidence,
            0
        );
        return Math.min(totalConfidence / scenes.length, 1.0);
    }
}
