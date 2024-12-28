import { App, Editor, MarkdownView, Notice } from 'obsidian';
import AIPlugin from './main';

export class AIPromptView {
    private container: HTMLElement;
    private input: HTMLInputElement;
    private dropdown: HTMLElement;
    private isVisible: boolean = false;
    private clickOutsideHandler: (e: MouseEvent) => void;

    constructor(
        private app: App,
        private plugin: AIPlugin,
        private editor: Editor
    ) {
        this.container = document.createElement('div');
        this.container.addClass('ai-prompt-container');
        
        // 创建输入框
        this.input = document.createElement('input');
        this.input.addClass('ai-prompt-input');
        this.input.placeholder = '按住空格启动 AI...';
        this.container.appendChild(this.input);
        
        // 创建下拉面板
        this.dropdown = document.createElement('div');
        this.dropdown.addClass('ai-prompt-dropdown');
        this.container.appendChild(this.dropdown);
        
        // 初始化命令列表
        this.initializeDropdown();
        
        // 注册点击外部事件
        this.clickOutsideHandler = this.handleClickOutside.bind(this);
    }

    private initializeDropdown() {
        const commands = [
            { id: 'summarize', name: '添加摘要', icon: 'list' },
            { id: 'todo', name: '添加待办事项', icon: 'checkbox' },
            { id: 'table', name: '添加表格', icon: 'table' },
            { id: 'flowchart', name: '添加流程图', icon: 'flow' }
        ];

        commands.forEach(cmd => {
            const item = document.createElement('div');
            item.addClass('ai-prompt-item');
            
            const icon = document.createElement('span');
            icon.addClass('ai-prompt-icon');
            icon.addClass(cmd.icon);
            
            const text = document.createElement('span');
            text.textContent = cmd.name;
            
            item.appendChild(icon);
            item.appendChild(text);
            
            item.addEventListener('click', async () => {
                const prompt = this.input.value;
                const result = await this.executeCommand(cmd.id, prompt);
                if (result) {
                    this.editor.replaceSelection(result);
                }
                this.hide();
            });
            
            this.dropdown.appendChild(item);
        });
    }

    private async executeCommand(commandId: string, prompt: string): Promise<string> {
        try {
            switch (commandId) {
                case 'summarize':
                    return await this.plugin.generateSummary(prompt);
                case 'todo':
                    return await this.plugin.generateTodoList(prompt);
                case 'table':
                    return await this.plugin.generateTable(prompt);
                case 'flowchart':
                    return await this.plugin.generateFlowchart(prompt);
                default:
                    return '';
            }
        } catch (error) {
            new Notice('执行命令失败: ' + error.message);
            return '';
        }
    }

    public isInputFocused(): boolean {
        return document.activeElement === this.input;
    }

    show(position: { left: number; top: number }) {
        if (!this.isVisible) {
            // 确保容器在视窗内
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 调整左侧位置，确保不超出右边界
            let left = position.left;
            if (left + 300 > viewportWidth) { // 300px 是容器的最小宽度
                left = viewportWidth - 310; // 留出一些边距
            }
            
            // 调整顶部位置，确保不超出底部边界
            let top = position.top;
            const estimatedHeight = 200; // 估计的容器高度
            if (top + estimatedHeight > viewportHeight) {
                top = position.top - estimatedHeight - 10; // ���上显示
            }
            
            this.container.style.left = `${Math.max(10, left)}px`;
            this.container.style.top = `${Math.max(10, top)}px`;
            
            document.body.appendChild(this.container);
            
            // 添加一个小延迟来确保焦点设置正确
            setTimeout(() => {
                this.input.focus();
            }, 50);
            
            document.addEventListener('mousedown', this.clickOutsideHandler);
            this.isVisible = true;
        }
    }

    hide() {
        if (this.isVisible) {
            this.container.remove();
            document.removeEventListener('mousedown', this.clickOutsideHandler);
            this.isVisible = false;
            this.input.value = '';
        }
    }

    private handleClickOutside(e: MouseEvent) {
        if (!this.container.contains(e.target as Node)) {
            this.hide();
        }
    }
} 
