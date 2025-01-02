import {Plugin, MarkdownView} from 'obsidian';
import { AISettingTab, AIPluginSettings, DEFAULT_SETTINGS, AI_PROVIDERS, AIProvider } from './settings';
import { PlaceholderPlugin, PlaceholderPluginActions } from './ViewPlugins/PlaceholderPlugin';
import type { Extension } from '@codemirror/state';


export default class AIPlugin extends Plugin {
    settings: AIPluginSettings;
    private editorExtension: Extension[] | null = null;

    async onload() {
        await this.loadSettings();
        
        this.addSettingTab(new AISettingTab(this.app, this));

        // 设置插件实例
        PlaceholderPluginActions.setPlugin(this);

        // 监听活动视图变化
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updateEditorExtensions();
            })
        );

        // 监听布局变化（包括关闭文件）
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateEditorExtensions();
            })
        );
    }

    private updateEditorExtensions() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        try {
            if (activeView) {
                // 如果是 Markdown 视图且扩展未注册
                if (!this.editorExtension) {
                    console.log('Registering extensions for Markdown view');
                    // 确保扩展是一个数组
                    this.editorExtension = Array.isArray(PlaceholderPlugin) ? PlaceholderPlugin : [PlaceholderPlugin];
                    this.registerEditorExtension(this.editorExtension);
                }
            } else {
                // 如果不是 Markdown 视图且扩展已注册
                if (this.editorExtension) {
                    console.log('Unregistering extensions: not a Markdown view');
                    this.app.workspace.updateOptions();
                    this.editorExtension = null;
                }
            }
        } catch (error) {
            console.error('PlaceholderPlugin registration/unregistration failed:', error);
        }
    }

    async onunload() {
        // 清理编辑器扩展
        if (this.editorExtension) {
            console.log('Cleaning up editor extensions');
            this.app.workspace.updateOptions();
            this.editorExtension = null;
        }
        // 清理 PlaceholderPlugin 的资源
        PlaceholderPluginActions.cleanup();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
} 
