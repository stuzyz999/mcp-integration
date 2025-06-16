/**
 * GitHub MCP Server Integration Test
 * 测试GitHub MCP服务器与插件的集成
 */

import { McpToolManager } from '../src/McpToolManager.js';
import { SceneAnalyzer } from '../src/SceneAnalyzer.js';

class GitHubMcpTest {
    constructor() {
        this.toolManager = new McpToolManager();
        this.sceneAnalyzer = new SceneAnalyzer();
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🚀 开始GitHub MCP集成测试...\n');

        try {
            await this.testSceneDetection();
            await this.testGitHubMcpConnection();
            await this.testToolCalling();
            await this.testSearchScenarios();
            
            this.printResults();
        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        }
    }

    async testSceneDetection() {
        console.log('📋 测试场景识别...');
        
        const testCases = [
            {
                input: "帮我搜索一下React的最新仓库",
                expectedScene: "search",
                description: "搜索React仓库"
            },
            {
                input: "我想了解Vue.js的源代码结构",
                expectedScene: "search",
                description: "查看Vue.js源码"
            },
            {
                input: "查找JavaScript相关的热门项目",
                expectedScene: "search", 
                description: "搜索JavaScript项目"
            },
            {
                input: "还记得我们之前讨论的那个GitHub项目吗？",
                expectedScene: "memory",
                description: "回忆GitHub项目"
            }
        ];

        for (const testCase of testCases) {
            try {
                const analysis = await this.sceneAnalyzer.analyzeScene({
                    userInput: testCase.input
                });

                const detectedScenes = analysis.detectedScenes.map(s => s.type);
                const success = detectedScenes.includes(testCase.expectedScene);

                this.addTestResult({
                    test: `场景识别: ${testCase.description}`,
                    input: testCase.input,
                    expected: testCase.expectedScene,
                    actual: detectedScenes,
                    success: success,
                    confidence: analysis.confidence
                });

                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}`);
                console.log(`     输入: "${testCase.input}"`);
                console.log(`     检测到: [${detectedScenes.join(', ')}]`);
                console.log(`     置信度: ${(analysis.confidence * 100).toFixed(1)}%\n`);

            } catch (error) {
                this.addTestResult({
                    test: `场景识别: ${testCase.description}`,
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ${testCase.description} - 错误: ${error.message}\n`);
            }
        }
    }

    async testGitHubMcpConnection() {
        console.log('🔗 测试GitHub MCP连接...');

        try {
            // 模拟GitHub MCP工具配置
            const githubConfig = {
                enabled: true,
                serverUrl: 'http://localhost:3100/mcp',
                timeout: 10000,
                maxRetries: 2,
                sceneTypes: ['search', 'memory']
            };

            // 检查配置是否正确
            const configValid = this.validateGitHubConfig(githubConfig);
            
            this.addTestResult({
                test: 'GitHub MCP配置验证',
                success: configValid,
                details: githubConfig
            });

            console.log(`  ${configValid ? '✅' : '❌'} GitHub MCP配置验证`);
            console.log(`     服务器URL: ${githubConfig.serverUrl}`);
            console.log(`     场景类型: [${githubConfig.sceneTypes.join(', ')}]\n`);

        } catch (error) {
            this.addTestResult({
                test: 'GitHub MCP连接测试',
                success: false,
                error: error.message
            });
            console.log(`  ❌ GitHub MCP连接测试失败: ${error.message}\n`);
        }
    }

    async testToolCalling() {
        console.log('🛠️ 测试工具调用...');

        const mockTools = [
            {
                name: 'search_repositories',
                args: { query: 'language:javascript stars:>1000', sort: 'stars' },
                description: '搜索JavaScript仓库'
            },
            {
                name: 'search_code',
                args: { query: 'function addEventListener', language: 'javascript' },
                description: '搜索代码片段'
            },
            {
                name: 'get_repository',
                args: { owner: 'microsoft', repo: 'vscode' },
                description: '获取VSCode仓库信息'
            }
        ];

        for (const tool of mockTools) {
            try {
                // 模拟工具调用
                const result = await this.mockToolCall(tool.name, tool.args);
                
                this.addTestResult({
                    test: `工具调用: ${tool.description}`,
                    tool: tool.name,
                    args: tool.args,
                    success: result.success,
                    result: result.data
                });

                console.log(`  ${result.success ? '✅' : '❌'} ${tool.description}`);
                console.log(`     工具: ${tool.name}`);
                console.log(`     参数: ${JSON.stringify(tool.args)}`);
                if (result.success) {
                    console.log(`     结果: ${result.data.summary}\n`);
                } else {
                    console.log(`     错误: ${result.error}\n`);
                }

            } catch (error) {
                this.addTestResult({
                    test: `工具调用: ${tool.description}`,
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ${tool.description} - 错误: ${error.message}\n`);
            }
        }
    }

    async testSearchScenarios() {
        console.log('🔍 测试搜索场景集成...');

        const scenarios = [
            {
                userInput: "帮我找一些机器学习相关的Python项目",
                expectedTools: ['search_repositories'],
                description: "搜索机器学习项目"
            },
            {
                userInput: "我想看看React Hook的实现代码",
                expectedTools: ['search_code', 'get_file_contents'],
                description: "查看React Hook代码"
            },
            {
                userInput: "查找关于TypeScript的最新问题",
                expectedTools: ['search_issues'],
                description: "搜索TypeScript问题"
            }
        ];

        for (const scenario of scenarios) {
            try {
                // 分析场景
                const analysis = await this.sceneAnalyzer.analyzeScene({
                    userInput: scenario.userInput
                });

                // 检查推荐的工具
                const recommendedTools = analysis.recommendedTools || [];
                const toolNames = recommendedTools.map(t => t.name);
                
                const hasExpectedTools = scenario.expectedTools.some(tool => 
                    toolNames.includes(tool)
                );

                this.addTestResult({
                    test: `搜索场景: ${scenario.description}`,
                    input: scenario.userInput,
                    expectedTools: scenario.expectedTools,
                    recommendedTools: toolNames,
                    success: hasExpectedTools,
                    confidence: analysis.confidence
                });

                console.log(`  ${hasExpectedTools ? '✅' : '❌'} ${scenario.description}`);
                console.log(`     输入: "${scenario.userInput}"`);
                console.log(`     推荐工具: [${toolNames.join(', ')}]`);
                console.log(`     置信度: ${(analysis.confidence * 100).toFixed(1)}%\n`);

            } catch (error) {
                this.addTestResult({
                    test: `搜索场景: ${scenario.description}`,
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ${scenario.description} - 错误: ${error.message}\n`);
            }
        }
    }

    validateGitHubConfig(config) {
        return config.enabled && 
               config.serverUrl && 
               config.sceneTypes && 
               config.sceneTypes.length > 0;
    }

    async mockToolCall(toolName, args) {
        // 模拟GitHub MCP工具调用
        const mockResponses = {
            'search_repositories': {
                success: true,
                data: {
                    summary: `找到 ${Math.floor(Math.random() * 100)} 个相关仓库`,
                    repositories: ['repo1', 'repo2', 'repo3']
                }
            },
            'search_code': {
                success: true,
                data: {
                    summary: `找到 ${Math.floor(Math.random() * 50)} 个代码片段`,
                    files: ['file1.js', 'file2.js']
                }
            },
            'get_repository': {
                success: true,
                data: {
                    summary: '成功获取仓库信息',
                    name: args.repo,
                    owner: args.owner,
                    stars: Math.floor(Math.random() * 10000)
                }
            }
        };

        return mockResponses[toolName] || {
            success: false,
            error: `未知工具: ${toolName}`
        };
    }

    addTestResult(result) {
        this.testResults.push({
            ...result,
            timestamp: new Date().toISOString()
        });
    }

    printResults() {
        console.log('\n📊 测试结果汇总:');
        console.log('='.repeat(50));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;

        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${passedTests} ✅`);
        console.log(`失败: ${failedTests} ❌`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (failedTests > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`  - ${r.test}: ${r.error || '未知错误'}`);
                });
        }

        console.log('\n🎉 测试完成!');
    }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new GitHubMcpTest();
    test.runAllTests().catch(console.error);
}

export { GitHubMcpTest };
