import { App, Plugin, Editor, Menu, Notice, MarkdownView, EditorPosition } from 'obsidian';
import { AIPromptView } from './AIPromptView';
import { AISettingTab, AIPluginSettings, DEFAULT_SETTINGS, AI_PROVIDERS, AIProvider } from './settings';

interface AIResponse {
    content: string;
    status: 'success' | 'error';
}

interface ResponseModalOptions {
    result: string;
    onAccept: () => void;
    onReject: () => void;
    onRetry: () => void;
}

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

    private async callAIAPI(prompt: string): Promise<AIResponse> {
        try {
            const provider = AI_PROVIDERS.find((p: AIProvider) => p.id === this.settings.provider);
            if (!provider) {
                return { content: '', status: 'error' };
            }

            // 使用自定义端点或默认端点
            const apiEndpoint = this.settings.apiEndpoint || provider.baseUrl;
            if (!apiEndpoint) {
                return { content: '', status: 'error' };
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
                return {
                    content: `API request failed: ${response.statusText}`,
                    status: 'error'
                };
            }

            const data = await response.json();
            
            // 根据不同提供商解析不同的响应格式
            let content = '';
            switch (this.settings.provider) {
                case 'claude':
                    content = data.content[0].text;
                    break;
                default:
                    content = data.choices[0].message.content;
            }

            return {
                content: content,
                status: 'success'
            };

        } catch (error) {
            return {
                content: (error as Error).message,
                status: 'error'
            };
        }
    }

    // AI 功能方法
    public async generateSummary(prompt: string): Promise<string> {
        const response = await this.callAIAPI(`生成摘要：${prompt}`);
        return response.status === 'success' ? response.content : '';
    }

    public async generateTodoList(prompt: string): Promise<string> {
        const response = await this.callAIAPI(`生成待办事项：${prompt}`);
        return response.status === 'success' ? response.content : '';
    }

    public async generateTable(prompt: string): Promise<string> {
        const response = await this.callAIAPI(`生成表格：${prompt}`);
        return response.status === 'success' ? response.content : '';
    }

    public async generateFlowchart(prompt: string): Promise<string> {
        try {
            // 显示加载状态
            const loadingNotice = new Notice('正在思考中...', 0);
            
            const response = await this.callAIAPI(`使用 Mermaid 语法生成流程图：${prompt}`);
            
            // 关闭加载提示
            loadingNotice.hide();

            if (response.status === 'success' && response.content) {
                // 显示结果确认面板
                this.showResponseModal({
                    result: response.content,
                    onAccept: () => {
                        // 在编辑器中插入流程图
                        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                        if (editor) {
                            const mermaidCode = `\`\`\`mermaid\n${response.content}\n\`\`\`\n`;
                            editor.replaceSelection(mermaidCode);
                        }
                    },
                    onReject: () => {
                        // 不做任何操作，关闭面板
                    },
                    onRetry: async () => {
                        // 重新生成
                        return await this.generateFlowchart(prompt);
                    }
                });
            }
            return '';
        } catch (error) {
            new Notice('生成流程图失败: ' + (error as Error).message);
            return '';
        }
    }

    public async generateResponse(prompt: string): Promise<string> {
        try {
            const loadingNotice = new Notice('AI 正在思考...', 0);
            const response = await this.callAIAPI(prompt);
            loadingNotice.hide();
            
            if (response.status === 'error') {
                throw new Error(response.content);
            }
            
            return response.content;
        } catch (error) {
            console.error('AI Response Error:', error);
            throw error;
        }
    }

    private showResponseModal(options: ResponseModalOptions) {
        const modal = document.createElement('div');
        modal.addClass('ai-response-modal');

        // 预览区域
        const previewArea = document.createElement('div');
        previewArea.addClass('ai-response-preview');
        previewArea.innerHTML = `
            <div class="preview-header">预览</div>
            <div class="preview-content">
                <pre><code>${options.result}</code></pre>
            </div>
        `;
        modal.appendChild(previewArea);

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.addClass('button-container');

        // 接受按钮
        const acceptButton = document.createElement('button');
        acceptButton.setText('接受');
        acceptButton.addClass('mod-cta');
        acceptButton.addEventListener('click', () => {
            options.onAccept();
            document.body.removeChild(modal);
        });

        // 放弃按钮
        const rejectButton = document.createElement('button');
        rejectButton.setText('放弃');
        rejectButton.addEventListener('click', () => {
            options.onReject();
            document.body.removeChild(modal);
        });

        // 重试按钮
        const retryButton = document.createElement('button');
        retryButton.setText('再试一次');
        retryButton.addEventListener('click', async () => {
            document.body.removeChild(modal);
            await options.onRetry();
        });

        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(rejectButton);
        buttonContainer.appendChild(retryButton);
        modal.appendChild(buttonContainer);

        // 添加到文档中
        document.body.appendChild(modal);

        // 点击外部关闭
        const handleClickOutside = (e: MouseEvent) => {
            if (!modal.contains(e.target as Node)) {
                document.body.removeChild(modal);
                document.removeEventListener('mousedown', handleClickOutside);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
    }
} 
