import { App, Plugin, Editor, Menu, Notice, MarkdownView, EditorPosition } from 'obsidian';
import { AIPromptView } from './AIPromptView';

export default class AIPlugin extends Plugin {
    private aiPromptView: AIPromptView | null = null;
    private placeholderMarker: any = null;

    async onload() {
        await this.loadSettings();
        
        this.addSettingTab(new AISettingTab(this.app, this));
        
        // 监听编辑器变化
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updatePlaceholder();
            })
        );

        this.registerEvent(
            this.app.workspace.on('editor-change', () => {
                this.updatePlaceholder();
            })
        );

        // 修改空格键事件处理
        this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
            if (evt.key === ' ' && !evt.isComposing) {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    const editor = activeView.editor;
                    const cursor = editor.getCursor();
                    const line = editor.getLine(cursor.line);
                    
                    // 只在空行上显示
                    if (!line.trim()) {
                        evt.preventDefault();
                        this.showAIPrompt(editor, cursor);
                    }
                }
            }
        });
    }

    private updatePlaceholder() {
        // 清除旧的占位符
        if (this.placeholderMarker) {
            this.placeholderMarker.clear();
            this.placeholderMarker = null;
        }

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        // 只在空行显示占位符
        if (!line.trim()) {
            const cmEditor = (editor as any).cm;
            if (cmEditor) {
                this.placeholderMarker = cmEditor.setBookmark(
                    { line: cursor.line, ch: 0 },
                    { widget: this.createPlaceholderElement() }
                );
            }
        }
    }

    private createPlaceholderElement(): HTMLElement {
        const placeholder = document.createElement('span');
        placeholder.addClass('ai-prompt-placeholder');
        placeholder.setText('按住空格启动 AI...');
        return placeholder;
    }

    private showAIPrompt(editor: Editor, cursor: EditorPosition) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        // 获取光标的准确位置
        const cmEditor = (view.editor as any).cm;
        if (cmEditor) {
            const cursorCoords = cmEditor.cursorCoords(true, 'local');
            const editorRect = view.containerEl.getBoundingClientRect();

            if (!this.aiPromptView) {
                this.aiPromptView = new AIPromptView(this.app, this, editor);
            }

            // 计算绝对位置
            const absoluteLeft = editorRect.left + cursorCoords.left;
            const absoluteTop = editorRect.top + cursorCoords.top;

            this.aiPromptView.show({
                left: absoluteLeft,
                top: absoluteTop + 20 // 在光标下方显示
            });
        }
    }

    onunload() {
        if (this.placeholderMarker) {
            this.placeholderMarker.clear();
        }
        if (this.aiPromptView) {
            this.aiPromptView.hide();
        }
    }

    // AI 功能方法
    public async generateSummary(prompt: string): Promise<string> {
        return await this.callAIAPI(prompt);
    }

    public async generateTodoList(prompt: string): Promise<string> {
        return await this.callAIAPI(prompt);
    }

    public async generateTable(prompt: string): Promise<string> {
        return await this.callAIAPI(prompt);
    }

    public async generateFlowchart(prompt: string): Promise<string> {
        return await this.callAIAPI(prompt);
    }
} 
