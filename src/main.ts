import { App, Plugin, Editor, Menu, Notice, MarkdownView, EditorPosition } from 'obsidian';
import { AIPromptView } from './AIPromptView';
import { AISettingTab, AIPluginSettings, DEFAULT_SETTINGS, AI_PROVIDERS, AIProvider } from './settings';

export default class AIPlugin extends Plugin {
    settings: AIPluginSettings;
    private aiPromptView: AIPromptView | null = null;
    private placeholderMarker: any = null;
    private placeholderText: string = "按住空格启动 AI...";

    async onload() {
        await this.loadSettings();
        
        this.addSettingTab(new AISettingTab(this.app, this));
        
        // 监听编辑器变化
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updatePlaceholder();
            })
        );

        // 监听编辑器内容变化和光标移动
        this.registerEvent(
            this.app.workspace.on('editor-change', () => {
                this.updatePlaceholder();
            })
        );

        let spaceKeyPressed = false;

        // 监听键盘事件
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
            // 处理空格键
            if (evt.key === ' ' && !evt.repeat && !evt.isComposing && !spaceKeyPressed) {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    const editor = activeView.editor;
                    const cursor = editor.getCursor();
                    const line = editor.getLine(cursor.line);
                    
                    // 只在空行上显示
                    if (!line.trim()) {
                        evt.preventDefault();
                        spaceKeyPressed = true;
                        this.showAIPrompt(editor, cursor);
                    }
                }
            }
            
            // 处理 Enter 键
            if (evt.key === 'Enter') {
                // 延迟执行以确保新行已创建
                setTimeout(() => {
                    this.updatePlaceholder();
                }, 0);
            }
        });

        // 空格键释放事件
        this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent) => {
            if (evt.key === ' ') {
                spaceKeyPressed = false;
                if (this.aiPromptView && !this.aiPromptView.isInputFocused()) {
                    this.aiPromptView.hide();
                }
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private updatePlaceholder() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        
        // 先清除所有占位符
        this.clearAllPlaceholders();

        // 获取所有空行
        const totalLines = editor.lineCount();
        for (let i = 0; i < totalLines; i++) {
            const line = editor.getLine(i);
            if (!line.trim()) {
                // 只在当前光标所在的空行显示占位符
                if (i === cursor.line) {
                    this.showPlaceholderAtLine(i, activeView);
                }
            }
        }
    }

    private clearAllPlaceholders() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        // 移除所有现有的占位符
        const existingPlaceholders = activeView.contentEl.querySelectorAll('.ai-prompt-placeholder');
        existingPlaceholders.forEach(el => el.remove());

        // 清除标记
        if (this.placeholderMarker) {
            this.placeholderMarker.clear();
            this.placeholderMarker = null;
        }
    }

    private showPlaceholderAtLine(lineNumber: number, view: MarkdownView) {
        const editorEl = view.contentEl.querySelector('.cm-editor');
        if (!editorEl) return;

        const lineEl = editorEl.querySelector(`.cm-line:nth-child(${lineNumber + 1})`);
        if (!lineEl) return;

        // 确保该行还没有占位符
        if (!lineEl.querySelector('.ai-prompt-placeholder')) {
            const placeholder = this.createPlaceholderElement();
            lineEl.appendChild(placeholder);
            
            // 保存标记以便后续清除
            this.placeholderMarker = {
                clear: () => placeholder.remove()
            };
        }
    }

    private createPlaceholderElement(): HTMLElement {
        const placeholder = document.createElement('span');
        placeholder.addClass('ai-prompt-placeholder');
        placeholder.setText(this.placeholderText);
        // 直接在元素上设置样式，确保样式生效
        placeholder.style.fontStyle = 'italic';
        placeholder.style.color = 'var(--text-faint)';
        return placeholder;
    }

    private showAIPrompt(editor: Editor, cursor: EditorPosition) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        // 获取编辑器容器和光标位置
        const editorEl = view.contentEl.querySelector('.cm-editor');
        if (!editorEl) return;

        const lineEl = editorEl.querySelector(`.cm-line:nth-child(${cursor.line + 1})`);
        if (!lineEl) return;

        // 获取行的位置
        const editorRect = editorEl.getBoundingClientRect();
        const lineRect = lineEl.getBoundingClientRect();

        if (!this.aiPromptView) {
            this.aiPromptView = new AIPromptView(this.app, this, editor);
        }

        // 计算绝对位置
        const absoluteLeft = lineRect.left;
        const absoluteTop = lineRect.top;

        this.aiPromptView.show({
            left: absoluteLeft,
            top: absoluteTop + lineRect.height // 在光标下方显示
        });
    }

    onunload() {
        if (this.placeholderMarker) {
            this.placeholderMarker.clear();
        }
        if (this.aiPromptView) {
            this.aiPromptView.hide();
        }
    }

    private async callAIAPI(prompt: string): Promise<string> {
        try {
            const provider = AI_PROVIDERS.find((p: AIProvider) => p.id === this.settings.provider);
            if (!provider) {
                throw new Error('未找到 AI 提供商');
            }

            // 使用自定义端点或默认端点
            const apiEndpoint = this.settings.apiEndpoint || provider.baseUrl;
            if (!apiEndpoint) {
                throw new Error('未设置 API 端点');
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            // 根据不同提供商设置不同的认证头
            switch (this.settings.provider) {
                case 'openai':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
                    break;
                case 'claude':
                    headers['x-api-key'] = this.settings.apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                    break;
                case 'azure':
                    headers['api-key'] = this.settings.apiKey;
                    break;
                case 'chatglm':
                    headers['Authorization'] = this.settings.apiKey;
                    break;
                default:
                    headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
            }

            // 根据不同提供商构造不同的请求体
            let requestBody: any;
            switch (this.settings.provider) {
                case 'claude':
                    requestBody = {
                        model: this.settings.model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 1000
                    };
                    break;
                default:
                    requestBody = {
                        model: this.settings.model,
                        messages: [{ role: 'user', content: prompt }]
                    };
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            
            // 根据不同提供商解析不同的响应格式
            switch (this.settings.provider) {
                case 'claude':
                    return data.content[0].text;
                default:
                    return data.choices[0].message.content;
            }
        } catch (error) {
            new Notice('AI API 调用失败: ' + (error as Error).message);
            return '';
        }
    }

    // AI 功能方法
    public async generateSummary(prompt: string): Promise<string> {
        return await this.callAIAPI(`生成摘要：${prompt}`);
    }

    public async generateTodoList(prompt: string): Promise<string> {
        return await this.callAIAPI(`生成待办事项：${prompt}`);
    }

    public async generateTable(prompt: string): Promise<string> {
        return await this.callAIAPI(`生成表格：${prompt}`);
    }

    public async generateFlowchart(prompt: string): Promise<string> {
        return await this.callAIAPI(`生成流程图：${prompt}`);
    }
} 
