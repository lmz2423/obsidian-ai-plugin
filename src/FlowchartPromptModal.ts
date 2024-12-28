import { Modal, App } from 'obsidian';

export class FlowchartPromptModal extends Modal {
    private result: string = '';
    private onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '流程图内容' });
        
        const inputContainer = contentEl.createDiv('input-container');
        
        const textArea = inputContainer.createEl('textarea', {
            cls: 'flowchart-input',
            attr: {
                placeholder: '请描述您想要创建的流程图内容...',
                rows: '6'
            }
        });

        // 监听输入事件
        textArea.addEventListener('input', (e) => {
            this.result = (e.target as HTMLTextAreaElement).value;
        });

        // 监听回车键
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submit();
            }
        });
    }

    private submit() {
        this.onSubmit(this.result);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 