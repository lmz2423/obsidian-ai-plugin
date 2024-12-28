import { Modal, App, Setting } from 'obsidian';

export class AIResponseModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;
    private onRetry: () => Promise<void>;

    constructor(
        app: App, 
        initialResult: string, 
        onSubmit: (result: string) => void,
        onRetry: () => Promise<void>
    ) {
        super(app);
        this.result = initialResult;
        this.onSubmit = onSubmit;
        this.onRetry = onRetry;
    }

    updateResult(newResult: string) {
        this.result = newResult;
        const responseArea = this.contentEl.querySelector('.ai-response-area') as HTMLTextAreaElement;
        if (responseArea) {
            responseArea.value = newResult;
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'AI 响应' });

        // 创建响应预览区域
        const responseArea = contentEl.createEl('textarea', {
            cls: 'ai-response-area',
            attr: {
                rows: '10',
                style: 'width: 100%; font-family: monospace;'
            }
        });
        responseArea.value = this.result;
        responseArea.addEventListener('input', (e) => {
            this.result = (e.target as HTMLTextAreaElement).value;
        });

        // 创建按钮区域
        const buttonContainer = contentEl.createDiv('button-container');

        // 接受按钮
        const acceptButton = buttonContainer.createEl('button', {
            text: '接受',
            cls: 'mod-cta'
        });
        acceptButton.addEventListener('click', () => {
            this.onSubmit(this.result);
            this.close();
        });

        // 放弃按钮
        const cancelButton = buttonContainer.createEl('button', {
            text: '放弃'
        });
        cancelButton.addEventListener('click', () => {
            this.onSubmit('');
            this.close();
        });

        // 重试按钮
        const retryButton = buttonContainer.createEl('button', {
            text: '重试'
        });
        retryButton.addEventListener('click', async () => {
            retryButton.setAttr('disabled', 'true');
            await this.onRetry();
            retryButton.removeAttribute('disabled');
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 