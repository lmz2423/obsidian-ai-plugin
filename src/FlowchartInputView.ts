import { App, Editor, Notice } from 'obsidian';
import AIPlugin from './main';
import { MarkdownView } from 'obsidian';

export class FlowchartInputView {
    private container: HTMLElement;
    private input: HTMLInputElement;
    private loadingBar: HTMLElement;
    private plugin: AIPlugin;
    private editor: Editor;
    private app: App;

    constructor(app: App, plugin: AIPlugin, editor: Editor) {
        this.plugin = plugin;
        this.editor = editor;
        this.app = app;
        
        // 创建容器
        this.container = document.createElement('div');
        this.container.addClass('flowchart-input-container');
        
        // 创建输入框
        this.input = document.createElement('input');
        this.input.addClass('ai-prompt-input');
        this.input.placeholder = '请输入流程图描述...';
        this.input.setAttribute('autofocus', 'true');
        
        // 创建加载条（初始隐藏）
        this.loadingBar = document.createElement('div');
        this.loadingBar.addClass('flowchart-loading-bar');
        this.loadingBar.setText('正在思考中...');
        this.loadingBar.style.display = 'none';
        
        this.container.appendChild(this.input);
        this.container.appendChild(this.loadingBar);
        
        // 绑定回车键事件
        this.input.addEventListener('keydown', async (evt: KeyboardEvent) => {
            if (evt.key === 'Enter') {
                evt.preventDefault();
                await this.handleEnter();
            }
            if (evt.key === 'Escape') {
                this.hide();
            }
        });
    }

    private async handleEnter() {
        const prompt = this.input.value.trim();
        if (!prompt) return;

        // 保存当前光标位置
        const currentCursor = this.editor.getCursor();

        try {
            // 显示加载状态
            this.input.style.display = 'none';
            this.loadingBar.style.display = 'block';

            const result = await this.plugin.generateFlowchart(prompt);
            
            // 在显示模态框之前隐藏加载状态
            this.loadingBar.style.display = 'none';
            
            if (result) {
                // 恢复光标位置
                this.editor.setCursor(currentCursor);
                this.showResponseModal(result, prompt);
            }
        } catch (error) {
            new Notice('生成流程图失败: ' + error.message);
            this.hide();
        }
    }

    private showResponseModal(result: string, originalPrompt: string) {
        const modal = document.createElement('div');
        modal.addClass('ai-response-modal');

        // 预览区域
        const previewArea = document.createElement('div');
        previewArea.addClass('ai-response-preview');
        previewArea.innerHTML = `
            <div class="preview-header">预览</div>
            <div class="preview-content">
                <pre><code>${result}</code></pre>
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
            const mermaidCode = `\`\`\`mermaid\n${result}\n\`\`\`\n`;
            this.editor.replaceSelection(mermaidCode);
            document.body.removeChild(modal);
            this.hide();
        });

        // 放弃按钮
        const rejectButton = document.createElement('button');
        rejectButton.setText('放弃');
        rejectButton.addClass('mod-danger');
        rejectButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.hide();
        });

        // 重试按钮
        const retryButton = document.createElement('button');
        retryButton.setText('再试一次');
        retryButton.addClass('mod-retry');
        retryButton.addEventListener('click', async () => {
            document.body.removeChild(modal);
            this.show();
            this.input.value = originalPrompt; // 保留原来的输入
            this.input.focus();
        });

        buttonContainer.appendChild(acceptButton);
        buttonContainer.appendChild(rejectButton);
        buttonContainer.appendChild(retryButton);
        modal.appendChild(buttonContainer);

        document.body.appendChild(modal);

        // 点击外部时显示确认对话框
        const handleClickOutside = (e: MouseEvent) => {
            if (!modal.contains(e.target as Node)) {
                // 避免重复创建确认对话框
                if (document.querySelector('.confirm-modal')) {
                    return;
                }

                // 创建确认对话框
                const confirmModal = document.createElement('div');
                confirmModal.addClass('ai-response-modal');
                confirmModal.addClass('confirm-modal');
                confirmModal.innerHTML = `
                    <div style="margin-bottom: 16px;">是否要关闭当前窗口?</div>
                    <div class="button-container">
                        <button class="mod-cta">保留</button>
                        <button>放弃</button>
                        <button>取消</button>
                    </div>
                `;

                const buttons = Array.from(confirmModal.querySelectorAll('button'));
                const [keepBtn, discardBtn, cancelBtn] = buttons;

                // 保留当前内容
                keepBtn.addEventListener('click', () => {
                    document.body.removeChild(confirmModal);
                });

                // 放弃并关闭所有窗口
                discardBtn.addEventListener('click', () => {
                    document.body.removeChild(confirmModal);
                    document.body.removeChild(modal);
                    document.removeEventListener('mousedown', handleClickOutside);
                    this.hide();
                });

                // 取消操作
                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(confirmModal);
                });

                document.body.appendChild(confirmModal);

                // 阻止事件冒泡,避免触发modal的点击事件
                e.stopPropagation();
            }
        };

        // 使用mousedown事件,保证在其他点击事件之前触发
        document.addEventListener('mousedown', handleClickOutside);
    }

    show() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        const cursor = this.editor.getCursor();
        const editorRect = view.contentEl.getBoundingClientRect();
        
        // 获取当前行的实际位置
        const lineElement = view.contentEl.querySelector('.cm-line');
        const lineHeight = lineElement ? lineElement.getBoundingClientRect().height : 22;
        
        // 计算输入框位置
        const left = editorRect.left + 20; // 添加一些左边距
        const top = editorRect.top + (cursor.line * lineHeight);
        
        this.container.style.position = 'fixed'; // 使用 fixed 定位以避免滚动问题
        this.container.style.left = `${left}px`;
        this.container.style.top = `${top + lineHeight}px`; // 在当前行下方显示
        
        document.body.appendChild(this.container);
        this.input.focus();
    }

    hide() {
        // 确保容器从DOM中移除
        if (document.body.contains(this.container)) {
            document.body.removeChild(this.container);
        }
        
        // 重置状态
        this.input.style.display = 'block';
        this.loadingBar.style.display = 'none';
        this.input.value = '';
    }
} 
