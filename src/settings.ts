import { App, PluginSettingTab, Setting } from 'obsidian';
import AIPlugin from './main';
import { I18nManager, Language } from './i18n';

export interface AIModel {
    id: string;
    name: string;
}

export interface AIProvider {
    id: string;
    name: string;
    models: AIModel[];
    baseUrl: string;
    defaultStream?: boolean;
}

export interface AIPluginSettings {
    provider: string;
    model: string;
    apiKeys: { [key: string]: string };
    apiEndpoints: { [key: string]: string };
    temperature: { [key: string]: number };
    streamMode: { [key: string]: boolean };
}

export const AI_PROVIDERS: AIProvider[] = [
    {
        id: 'custom',
        name: 'Custom Provider',
        baseUrl: '',
        models: []
    },
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
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
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
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' },
			{ id: 'deepseek-reasoner', name: 'DeepSeek r1' }
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
    apiEndpoints: {},
    temperature: {},
    streamMode: {}
};

export class AISettingTab extends PluginSettingTab {
    plugin: AIPlugin;
    i18n: I18nManager;

    constructor(app: App, plugin: AIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.i18n = I18nManager.getInstance();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 语言选择
        new Setting(containerEl)
            .setName('Language / 语言')
            .setDesc('Select language / 选择语言')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('en', 'English')
                    .addOption('zh', '中文')
                    .setValue(this.i18n.getCurrentLocale())
                    .onChange(async (value: Language) => {
                        this.i18n.setLocale(value);
                        this.display();
                    });
            });

        // AI 提供商选择
        new Setting(containerEl)
            .setName(this.i18n.t('settings.provider.name'))
            .setDesc(this.i18n.t('settings.provider.desc'))
            .addDropdown(dropdown => {
                AI_PROVIDERS.forEach(provider => {
                    dropdown.addOption(provider.id, provider.name);
                });
                dropdown.setValue(this.plugin.settings.provider)
                    .onChange(async (value) => {
                        this.plugin.settings.provider = value;
                        const provider = AI_PROVIDERS.find(p => p.id === value);
                        if (provider && provider.models.length > 0) {
                            this.plugin.settings.model = provider.models[0].id;
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // AI 模型选择
        const currentProvider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
        if (currentProvider) {
            new Setting(containerEl)
                .setName(this.i18n.t('settings.model.name'))
                .setDesc(this.i18n.t('settings.model.desc'))
                .addText(text => {
                    if (this.plugin.settings.provider === 'custom') {
                        // 自定义提供商时显示输入框
                        text.setPlaceholder('Enter model name')
                            .setValue(this.plugin.settings.model)
                            .onChange(async (value) => {
                                this.plugin.settings.model = value;
                                await this.plugin.saveSettings();
                            });
                    } else {
                        // 替换为下拉框组件
                        const parentEl = text.inputEl.parentElement;
                        if (parentEl) {
                            text.inputEl.replaceWith(
                                new Setting(parentEl)
                                    .addDropdown(dropdown => {
                                        currentProvider.models.forEach(model => {
                                            dropdown.addOption(model.id, model.name);
                                        });
                                        return dropdown.setValue(this.plugin.settings.model)
                                            .onChange(async (value) => {
                                                this.plugin.settings.model = value;
                                                await this.plugin.saveSettings();
                                            });
                                    })
                                    .controlEl
                            );
                        }
                    }
                });
        }

        // API Key 输入
        new Setting(containerEl)
            .setName(this.i18n.t('settings.apiKey.name'))
            .setDesc(this.i18n.t('settings.apiKey.desc'))
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKeys[this.plugin.settings.provider] || '')
                .onChange(async (value) => {
                    this.plugin.settings.apiKeys[this.plugin.settings.provider] = value;
                    await this.plugin.saveSettings();
                }));

        // API 端点输入
        new Setting(containerEl)
            .setName(this.i18n.t('settings.apiEndpoint.name'))
            .setDesc(this.i18n.t('settings.apiEndpoint.desc'))
            .addText(text => {
                const provider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
                const defaultEndpoint = provider?.baseUrl || '';
                text.setPlaceholder(defaultEndpoint)
                    .setValue(this.plugin.settings.apiEndpoints[this.plugin.settings.provider] || defaultEndpoint)
                    .onChange(async (value) => {
                        this.plugin.settings.apiEndpoints[this.plugin.settings.provider] = value || defaultEndpoint;
                        await this.plugin.saveSettings();
                    });
            });

        // 温度设置
        new Setting(containerEl)
            .setName(this.i18n.t('settings.temperature.name'))
            .setDesc(this.i18n.t('settings.temperature.desc'))
            .addSlider(slider => slider
                .setLimits(0, 2, 0.1)
                .setValue(this.plugin.settings.temperature[this.plugin.settings.provider] ?? 1.0)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.temperature[this.plugin.settings.provider] = value;
                    await this.plugin.saveSettings();
                }));

        // Stream 模式设置
        new Setting(containerEl)
            .setName(this.i18n.t('settings.streamMode.name'))
            .setDesc(this.i18n.t('settings.streamMode.desc'))
            .addToggle(toggle => {
                const provider = this.plugin.settings.provider;
                const isStream = this.plugin.settings.streamMode[provider] ?? true;
                toggle
                    .setValue(isStream)
                    .onChange(async (value) => {
                        this.plugin.settings.streamMode[provider] = value;
                        await this.plugin.saveSettings();
                    });
            });

        // 重置按钮
        new Setting(containerEl)
            .setName(this.i18n.t('settings.resetEndpoint.name'))
            .setDesc(this.i18n.t('settings.resetEndpoint.desc'))
            .addButton(button => button
                .setButtonText(this.i18n.t('settings.resetEndpoint.button'))
                .onClick(async () => {
                    const provider = AI_PROVIDERS.find(p => p.id === this.plugin.settings.provider);
                    if (provider) {
                        this.plugin.settings.apiEndpoints[this.plugin.settings.provider] = provider.baseUrl;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                }));
    }
} 
