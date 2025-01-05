import { App, PluginSettingTab, Setting } from 'obsidian';
import AIPlugin from './main';

export interface AIModel {
    id: string;
    name: string;
}

export interface AIProvider {
    id: string;
    name: string;
    models: AIModel[];
    baseUrl: string;
}

export interface AIPluginSettings {
    provider: string;
    model: string;
    apiKeys: { [key: string]: string };
    apiEndpoint: string;
    temperature: number;
}

export const AI_PROVIDERS: AIProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: [
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ]
    },
    {
        id: 'google',
        name: 'Google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        models: [
			{ id: 'gemini-1.5-flash', name: 'Gemini 1.5 flash' },
			{ id: 'gemini-1.5-pro,', name: 'Gemini 1.5 Pro' },
			{ id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
			{ id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental' },
			{ id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Gemini 2.0 Flash Thinking Experimental' },
			{ id: 'gemini-exp-1206', name: 'Gemini Experimental 1206' },
        ]
    },
    {
        id: 'claude',
        name: 'Claude',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: [
            { id: 'claude-3-opus', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
            { id: 'claude-2.1', name: 'Claude 2.1' }
        ]
    },
    {
        id: 'kimi',
        name: 'Kimi',
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        models: [
            { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K' },
            { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K' },
            { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K' }
        ]
    },
    {
        id: 'chatglm',
        name: 'ChatGLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        models: [
            { id: 'glm-4', name: 'GLM-4' },
            { id: 'glm-3-turbo', name: 'GLM-3 Turbo' }
        ]
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' }
        ]
    },
    {
        id: 'azure',
        name: 'Azure OpenAI',
        baseUrl: '', // 用户需要输入自己的 Azure 端点
        models: [
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' }
        ]
    },
    {
        id: 'moonshot',
        name: 'Moonshot',
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        models: [
            { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K' },
            { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K' },
            { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K' }
        ]
    }
];

export const DEFAULT_SETTINGS: AIPluginSettings = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKeys: {},
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    temperature: 1.0
};

export class AISettingTab extends PluginSettingTab {
    plugin: AIPlugin;

    constructor(app: App, plugin: AIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // AI 提供商选择
        new Setting(containerEl)
            .setName('AI Provider')
            .setDesc('选择 AI 服务提供商')
            .addDropdown(dropdown => {
                AI_PROVIDERS.forEach(provider => {
                    dropdown.addOption(provider.id, provider.name);
                });
                dropdown.setValue(this.plugin.settings.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.provider = value;
                        const provider = AI_PROVIDERS.find(p => p.id === value);
                        if (provider) {
                            // 设置默认模型
                            if (provider.models.length > 0) {
                                this.plugin.settings.model = provider.models[0].id;
                            }
                            // 更新 API 端点为新提供商的默认端点
                            this.plugin.settings.apiEndpoint = provider.baseUrl;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // AI 模型选择
        const currentProvider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
        if (currentProvider) {
            new Setting(containerEl)
                .setName('AI Model')
                .setDesc('选择 AI 模型')
                .addDropdown(dropdown => {
                    currentProvider.models.forEach(model => {
                        dropdown.addOption(model.id, model.name);
                    });
                    dropdown.setValue(this.plugin.settings.model)
                        .onChange(async (value) => {
                            this.plugin.settings.model = value;
                            await this.plugin.saveSettings();
                        });
                });
        }

        // API Key 输入
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('输入当前提供商的 API Key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKeys[this.plugin.settings.provider] || '')
                .onChange(async (value) => {
                    this.plugin.settings.apiKeys[this.plugin.settings.provider] = value;
                    await this.plugin.saveSettings();
                }));

        // API 端点输入（所有提供商都可以自定义）
        new Setting(containerEl)
            .setName('API Endpoint')
            .setDesc('输入 API 端点地址（可选，留空使用默认值）')
            .addText(text => {
                const provider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
                const defaultEndpoint = provider?.baseUrl || '';
                text.setPlaceholder(defaultEndpoint || 'Enter API endpoint')
                    .setValue(this.plugin.settings.apiEndpoint || defaultEndpoint)
                    .onChange(async (value) => {
                        this.plugin.settings.apiEndpoint = value || defaultEndpoint;
                        await this.plugin.saveSettings();
                    });
            });

        // 温度设置
        new Setting(containerEl)
            .setName('Temperature')
            .setDesc('调整模型输出的随机性 (0.0-2.0)')
            .addSlider(slider => slider
                .setLimits(0, 2, 0.1)
                .setValue(this.plugin.settings.temperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.temperature = value;
                    await this.plugin.saveSettings();
                }));

        // 添加重置按钮
        new Setting(containerEl)
            .setName('重置 API 端点')
            .setDesc('恢复默认 API 端点')
            .addButton(button => button
                .setButtonText('重置')
                .onClick(async () => {
                    const provider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
                    if (provider) {
                        this.plugin.settings.apiEndpoint = provider.baseUrl;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                }));
    }
} 
