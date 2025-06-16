/**
 * MCP Integration Configuration UI
 * JavaScript for the configuration interface
 */

class McpConfigUI {
    constructor() {
        this.config = null;
        this.status = null;
        this.logs = [];
        this.init();
    }

    async init() {
        await this.loadConfiguration();
        await this.loadStatus();
        this.setupEventListeners();
        this.renderUI();
        this.startStatusPolling();
    }

    async loadConfiguration() {
        try {
            const response = await fetch("/api/plugins/mcp-integration/config");
            this.config = await response.json();
        } catch (error) {
            this.addLog(
                "Error loading configuration: " + error.message,
                "error"
            );
        }
    }

    async loadStatus() {
        try {
            const response = await fetch("/api/plugins/mcp-integration/status");
            this.status = await response.json();
        } catch (error) {
            this.addLog("Error loading status: " + error.message, "error");
        }
    }

    setupEventListeners() {
        // 置信度阈值滑块
        const confidenceSlider = document.getElementById(
            "confidence-threshold"
        );
        const confidenceValue = document.getElementById("confidence-value");

        confidenceSlider.addEventListener("input", (e) => {
            confidenceValue.textContent = e.target.value;
        });

        // 其他输入框的事件监听
        document
            .getElementById("max-tools")
            .addEventListener("change", this.updateSettings.bind(this));
        document
            .getElementById("timeout")
            .addEventListener("change", this.updateSettings.bind(this));
    }

    renderUI() {
        this.renderGlobalSettings();
        this.renderToolsList();
        this.renderSceneMappings();
        this.renderStatistics();
        this.renderTestTools();
    }

    renderGlobalSettings() {
        if (!this.config || !this.status) return;

        const settings = this.status.settings || {};

        // 设置开关状态
        this.setSwitch("auto-trigger-switch", settings.autoTrigger);
        this.setSwitch("enable-caching-switch", settings.enableCaching);
        this.setSwitch("debug-mode-switch", settings.debugMode);

        // 设置输入值
        document.getElementById("confidence-threshold").value =
            settings.confidenceThreshold || 0.4;
        document.getElementById("confidence-value").textContent =
            settings.confidenceThreshold || 0.4;
        document.getElementById("max-tools").value =
            settings.maxToolsPerGeneration || 3;
        document.getElementById("timeout").value = settings.timeoutMs || 8000;
    }

    renderToolsList() {
        const toolsList = document.getElementById("tools-list");
        if (!this.config || !this.config.tools) {
            toolsList.innerHTML = "<p>No tools configured</p>";
            return;
        }

        toolsList.innerHTML = "";

        Object.entries(this.config.tools).forEach(([toolName, toolConfig]) => {
            const toolCard = this.createToolCard(toolName, toolConfig);
            toolsList.appendChild(toolCard);
        });
    }

    createToolCard(toolName, toolConfig) {
        const card = document.createElement("div");
        card.className = "mcp-tool-card";
        card.innerHTML = `
            <div class="mcp-tool-header">
                <div>
                    <span class="mcp-status-indicator mcp-status-disconnected" id="status-${toolName}"></span>
                    <strong>${toolName}</strong>
                    <small style="color: #6c757d; margin-left: 10px;">${
                        toolConfig.description || ""
                    }</small>
                </div>
                <div class="mcp-switch ${
                    toolConfig.enabled ? "active" : ""
                }" onclick="toggleToolEnabled('${toolName}')">
                    <div class="mcp-switch-handle"></div>
                </div>
            </div>
            <div class="mcp-tool-content">
                <div class="mcp-tool-grid">
                    <div class="mcp-form-group">
                        <label>Server URL</label>
                        <input type="text" value="${
                            toolConfig.serverUrl || ""
                        }" 
                               onchange="updateToolConfig('${toolName}', 'serverUrl', this.value)">
                    </div>
                    <div class="mcp-form-group">
                        <label>Priority</label>
                        <input type="range" min="0" max="1" step="0.1" value="${
                            toolConfig.priority || 1
                        }"
                               onchange="updateToolConfig('${toolName}', 'priority', this.value)">
                        <span>${toolConfig.priority || 1}</span>
                    </div>
                    <div class="mcp-form-group">
                        <label>Timeout (ms)</label>
                        <input type="number" value="${
                            toolConfig.timeout || 5000
                        }"
                               onchange="updateToolConfig('${toolName}', 'timeout', this.value)">
                    </div>
                    <div class="mcp-form-group">
                        <label>Scene Types</label>
                        <input type="text" value="${(
                            toolConfig.sceneTypes || []
                        ).join(", ")}"
                               placeholder="weather, search, memory"
                               onchange="updateToolSceneTypes('${toolName}', this.value)">
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <button class="mcp-button" onclick="testToolConnection('${toolName}')">Test Connection</button>
                    <button class="mcp-button secondary" onclick="removeTool('${toolName}')">Remove Tool</button>
                </div>
                <div id="test-result-${toolName}"></div>
            </div>
        `;
        return card;
    }

    renderSceneMappings() {
        const sceneMappings = document.getElementById("scene-mappings");
        const sceneTypes = [
            "weather",
            "location",
            "time",
            "memory",
            "search",
            "shopping",
        ];

        sceneMappings.innerHTML = "";

        sceneTypes.forEach((sceneType) => {
            const ruleDiv = document.createElement("div");
            ruleDiv.className = "mcp-scene-rule";

            const availableTools = this.getToolsForScene(sceneType);

            ruleDiv.innerHTML = `
                <strong>${sceneType}:</strong>
                <select onchange="updateSceneMapping('${sceneType}', this.value)" multiple>
                    ${availableTools
                        .map(
                            (tool) =>
                                `<option value="${tool}" ${
                                    this.isToolMappedToScene(tool, sceneType)
                                        ? "selected"
                                        : ""
                                }>${tool}</option>`
                        )
                        .join("")}
                </select>
            `;

            sceneMappings.appendChild(ruleDiv);
        });
    }

    renderStatistics() {
        const statsGrid = document.getElementById("stats-grid");
        if (!this.status || !this.status.stats) {
            statsGrid.innerHTML = "<p>No statistics available</p>";
            return;
        }

        const stats = this.status.stats;
        statsGrid.innerHTML = `
            <div class="mcp-stat-card">
                <div class="mcp-stat-value">${stats.totalGenerations || 0}</div>
                <div class="mcp-stat-label">Total Generations</div>
            </div>
            <div class="mcp-stat-card">
                <div class="mcp-stat-value">${
                    stats.toolCallsTriggered || 0
                }</div>
                <div class="mcp-stat-label">Tool Calls Triggered</div>
            </div>
            <div class="mcp-stat-card">
                <div class="mcp-stat-value">${stats.successfulCalls || 0}</div>
                <div class="mcp-stat-label">Successful Calls</div>
            </div>
            <div class="mcp-stat-card">
                <div class="mcp-stat-value">${stats.successRate || "0%"}</div>
                <div class="mcp-stat-label">Success Rate</div>
            </div>
        `;
    }

    renderTestTools() {
        const testToolSelect = document.getElementById("test-tool");
        if (!this.config || !this.config.tools) return;

        testToolSelect.innerHTML = '<option value="">Select a tool...</option>';

        Object.keys(this.config.tools).forEach((toolName) => {
            const option = document.createElement("option");
            option.value = toolName;
            option.textContent = toolName;
            testToolSelect.appendChild(option);
        });
    }

    getToolsForScene(sceneType) {
        if (!this.config || !this.config.tools) return [];

        return Object.entries(this.config.tools)
            .filter(
                ([_, config]) =>
                    config.sceneTypes && config.sceneTypes.includes(sceneType)
            )
            .map(([name, _]) => name);
    }

    isToolMappedToScene(toolName, sceneType) {
        if (!this.config || !this.config.tools || !this.config.tools[toolName])
            return false;

        const sceneTypes = this.config.tools[toolName].sceneTypes || [];
        return sceneTypes.includes(sceneType);
    }

    setSwitch(switchId, active) {
        const switchElement = document.getElementById(switchId);
        if (active) {
            switchElement.classList.add("active");
        } else {
            switchElement.classList.remove("active");
        }
    }

    async updateSettings() {
        const settings = {
            autoTrigger: document
                .getElementById("auto-trigger-switch")
                .classList.contains("active"),
            confidenceThreshold: parseFloat(
                document.getElementById("confidence-threshold").value
            ),
            maxToolsPerGeneration: parseInt(
                document.getElementById("max-tools").value
            ),
            timeoutMs: parseInt(document.getElementById("timeout").value),
            enableCaching: document
                .getElementById("enable-caching-switch")
                .classList.contains("active"),
            debugMode: document
                .getElementById("debug-mode-switch")
                .classList.contains("active"),
        };

        try {
            const response = await fetch(
                "/api/plugins/mcp-integration/settings",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(settings),
                }
            );

            if (response.ok) {
                this.addLog("Settings updated successfully", "info");
            } else {
                throw new Error("Failed to update settings");
            }
        } catch (error) {
            this.addLog("Error updating settings: " + error.message, "error");
        }
    }

    async saveConfiguration() {
        try {
            const response = await fetch(
                "/api/plugins/mcp-integration/config",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.config),
                }
            );

            if (response.ok) {
                this.addLog("Configuration saved successfully", "success");
            } else {
                throw new Error("Failed to save configuration");
            }
        } catch (error) {
            this.addLog(
                "Error saving configuration: " + error.message,
                "error"
            );
        }
    }

    startStatusPolling() {
        setInterval(async () => {
            await this.loadStatus();
            this.updateToolStatuses();
        }, 5000); // 每5秒更新一次状态
    }

    async updateToolStatuses() {
        try {
            const response = await fetch(
                "/api/plugins/mcp-integration/tools/health"
            );
            const health = await response.json();

            Object.entries(health).forEach(([toolName, status]) => {
                const indicator = document.getElementById(`status-${toolName}`);
                if (indicator) {
                    indicator.className = `mcp-status-indicator mcp-status-${status.status}`;
                }
            });
        } catch (error) {
            console.error("Error updating tool statuses:", error);
        }
    }

    addLog(message, type = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;

        this.logs.push(logEntry);
        if (this.logs.length > 100) {
            this.logs.shift(); // 保持最近100条日志
        }

        const logContainer = document.getElementById("log-container");
        if (logContainer) {
            logContainer.innerHTML = this.logs.join("\n");
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
}

// 全局实例
let mcpConfigUI;

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
    mcpConfigUI = new McpConfigUI();
});

// 全局函数 - 供HTML调用

function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const arrow = document.getElementById(sectionId + "-arrow");

    if (content.classList.contains("mcp-collapsible")) {
        content.classList.toggle("expanded");
        arrow.textContent = content.classList.contains("expanded") ? "▲" : "▼";
    }
}

function toggleSwitch(switchId) {
    const switchElement = document.getElementById(switchId);
    switchElement.classList.toggle("active");

    // 立即更新设置
    if (mcpConfigUI) {
        mcpConfigUI.updateSettings();
    }
}

function toggleToolEnabled(toolName) {
    if (!mcpConfigUI || !mcpConfigUI.config) return;

    mcpConfigUI.config.tools[toolName].enabled =
        !mcpConfigUI.config.tools[toolName].enabled;
    mcpConfigUI.renderToolsList();
    mcpConfigUI.addLog(
        `Tool ${toolName} ${
            mcpConfigUI.config.tools[toolName].enabled ? "enabled" : "disabled"
        }`,
        "info"
    );
}

function updateToolConfig(toolName, property, value) {
    if (!mcpConfigUI || !mcpConfigUI.config) return;

    if (property === "priority" || property === "timeout") {
        value = parseFloat(value);
    }

    mcpConfigUI.config.tools[toolName][property] = value;
    mcpConfigUI.addLog(`Updated ${toolName}.${property} to ${value}`, "info");
}

function updateToolSceneTypes(toolName, value) {
    if (!mcpConfigUI || !mcpConfigUI.config) return;

    const sceneTypes = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
    mcpConfigUI.config.tools[toolName].sceneTypes = sceneTypes;
    mcpConfigUI.addLog(
        `Updated ${toolName} scene types: ${sceneTypes.join(", ")}`,
        "info"
    );
}

async function testToolConnection(toolName) {
    const resultDiv = document.getElementById(`test-result-${toolName}`);
    resultDiv.innerHTML =
        '<div class="mcp-loading"></div> Testing connection...';

    try {
        const response = await fetch(
            "/api/plugins/mcp-integration/tools/test",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toolName: toolName,
                    function: "ping",
                    args: {},
                }),
            }
        );

        const result = await response.json();

        if (result.success) {
            resultDiv.innerHTML =
                '<div class="mcp-test-success">✅ Connection successful</div>';
        } else {
            resultDiv.innerHTML = `<div class="mcp-test-error">❌ Connection failed: ${result.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="mcp-test-error">❌ Test failed: ${error.message}</div>`;
    }
}

function removeTool(toolName) {
    if (!confirm(`Are you sure you want to remove tool "${toolName}"?`)) return;

    if (mcpConfigUI && mcpConfigUI.config && mcpConfigUI.config.tools) {
        delete mcpConfigUI.config.tools[toolName];
        mcpConfigUI.renderToolsList();
        mcpConfigUI.addLog(`Removed tool: ${toolName}`, "info");
    }
}

function addNewTool() {
    const toolName = prompt("Enter tool name:");
    if (!toolName) return;

    const serverUrl = prompt("Enter server URL:");
    if (!serverUrl) return;

    if (mcpConfigUI && mcpConfigUI.config) {
        mcpConfigUI.config.tools[toolName] = {
            enabled: false,
            serverUrl: serverUrl,
            timeout: 5000,
            maxRetries: 2,
            cacheTimeout: 300000,
            priority: 1,
            sceneTypes: [],
            description: "Custom MCP tool",
        };

        mcpConfigUI.renderToolsList();
        mcpConfigUI.addLog(`Added new tool: ${toolName}`, "info");
    }
}

async function testSceneAnalysis() {
    const text = document.getElementById("test-text").value;
    if (!text.trim()) {
        alert("Please enter text to analyze");
        return;
    }

    const resultDiv = document.getElementById("analysis-result");
    resultDiv.innerHTML = '<div class="mcp-loading"></div> Analyzing scene...';

    try {
        const response = await fetch("/api/plugins/mcp-integration/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                context: {},
            }),
        });

        const analysis = await response.json();

        resultDiv.innerHTML = `
            <div class="mcp-test-success">
                <h4>Scene Analysis Results:</h4>
                <p><strong>Detected Scenes:</strong> ${
                    analysis.detectedScenes
                        ?.map(
                            (s) =>
                                `${s.type} (${(s.confidence * 100).toFixed(
                                    1
                                )}%)`
                        )
                        .join(", ") || "None"
                }</p>
                <p><strong>Recommended Tools:</strong> ${
                    analysis.recommendedTools?.map((t) => t.name).join(", ") ||
                    "None"
                }</p>
                <p><strong>Overall Confidence:</strong> ${(
                    analysis.confidence * 100
                ).toFixed(1)}%</p>
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<div class="mcp-test-error">❌ Analysis failed: ${error.message}</div>`;
    }
}

async function testToolCall() {
    const toolName = document.getElementById("test-tool").value;
    const argsText = document.getElementById("test-args").value;

    if (!toolName) {
        alert("Please select a tool");
        return;
    }

    let args = {};
    if (argsText.trim()) {
        try {
            args = JSON.parse(argsText);
        } catch (error) {
            alert("Invalid JSON in arguments");
            return;
        }
    }

    const resultDiv = document.getElementById("tool-test-result");
    resultDiv.innerHTML =
        '<div class="mcp-loading"></div> Testing tool call...';

    try {
        const response = await fetch(
            "/api/plugins/mcp-integration/tools/test",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toolName: toolName,
                    function: toolName, // 使用工具名作为函数名
                    args: args,
                }),
            }
        );

        const result = await response.json();

        if (result.success) {
            resultDiv.innerHTML = `
                <div class="mcp-test-success">
                    <h4>Tool Call Successful:</h4>
                    <pre>${JSON.stringify(result.result, null, 2)}</pre>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<div class="mcp-test-error">❌ Tool call failed: ${result.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="mcp-test-error">❌ Test failed: ${error.message}</div>`;
    }
}

async function refreshStats() {
    if (mcpConfigUI) {
        await mcpConfigUI.loadStatus();
        mcpConfigUI.renderStatistics();
        mcpConfigUI.addLog("Statistics refreshed", "info");
    }
}

async function clearCache() {
    try {
        const response = await fetch(
            "/api/plugins/mcp-integration/cache/clear",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            }
        );

        if (response.ok) {
            mcpConfigUI.addLog("Cache cleared successfully", "info");
        } else {
            throw new Error("Failed to clear cache");
        }
    } catch (error) {
        mcpConfigUI.addLog("Error clearing cache: " + error.message, "error");
    }
}

function clearLogs() {
    if (mcpConfigUI) {
        mcpConfigUI.logs = [];
        document.getElementById("log-container").innerHTML = "";
    }
}

async function saveConfiguration() {
    if (mcpConfigUI) {
        await mcpConfigUI.saveConfiguration();
    }
}

async function loadConfiguration() {
    if (mcpConfigUI) {
        await mcpConfigUI.loadConfiguration();
        mcpConfigUI.renderUI();
        mcpConfigUI.addLog("Configuration reloaded", "info");
    }
}

function resetConfiguration() {
    if (
        !confirm(
            "Are you sure you want to reset to default configuration? This will lose all current settings."
        )
    ) {
        return;
    }

    // 重置为默认配置的逻辑
    mcpConfigUI.addLog("Configuration reset to defaults", "warning");
    location.reload(); // 简单的重新加载页面
}
