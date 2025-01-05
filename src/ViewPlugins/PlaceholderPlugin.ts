import {
	Decoration,
	WidgetType,
	ViewPlugin,
	ViewUpdate,
	DecorationSet,
	keymap,
	EditorView,
	PluginValue,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type AIPlugin from "../main";
import { AI_PROVIDERS } from "../settings";
import { MarkdownView, Notice, requestUrl, RequestUrlParam } from "obsidian";
import { createPromptInputManager } from '../managers/PromptInputManager'

// ================ 类型定义 ================
interface PlaceholderPluginValue extends PluginValue {
	decorations: DecorationSet;
}

// ================ 状态效果 ================
const addPromptInputEffect = StateEffect.define<DecorationSet>();

// ================ 占位符小部件 ================
class PlaceholderWidget extends WidgetType {
	toDOM() {
		const span = document.createElement("span");
		span.textContent = " 按下空格键启动AI";
		span.style.cssText = `
			color: rgba(0,0,0,0.3);
			pointer-events: none;
			position: absolute;
			left: 4px;
			top: 50%;
			transform: translateY(-50%);
			font-style: italic;
		`;
		return span;
	}
}

// ================ 插件核心类 ================
class PlaceholderPluginClass implements PlaceholderPluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.computeDecorations(view);
	}

	update(update: ViewUpdate) {
		if (this.shouldUpdateDecorations(update)) {
			this.decorations = this.computeDecorations(update.view);
		}
	}

	private shouldUpdateDecorations(update: ViewUpdate): boolean {
		// 处理 StateEffect
		for (const tr of update.transactions) {
			for (const effect of tr.effects) {
				if (effect.is(addPromptInputEffect)) {
					this.decorations = effect.value;
					return false;
				}
			}
		}
		return update.docChanged || update.selectionSet;
	}

	computeDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const cursor = view.state.selection.main.head;
		const line = view.state.doc.lineAt(cursor);
		
		if (this.isEmptyLine(line.text)) {
			this.addPlaceholderDecoration(builder, line.from);
		}

		return builder.finish();
	}

	private isEmptyLine(text: string): boolean {
		return text.trim().length === 0;
	}

	private addPlaceholderDecoration(builder: RangeSetBuilder<Decoration>, position: number) {
		const deco = Decoration.widget({
			widget: new PlaceholderWidget(),
			side: -1
		});
		builder.add(position, position, deco);
	}
}

// ================ 插件实例和扩展 ================
const basePlugin = ViewPlugin.fromClass(PlaceholderPluginClass, {
	decorations: v => v.decorations
});

const decorationExtension = EditorView.decorations.of((view: EditorView): DecorationSet => {
	const pluginInstance = view.plugin(basePlugin) as PlaceholderPluginValue | null;
	return pluginInstance?.decorations || Decoration.none;
});

const PlaceholderPluginExtension = [basePlugin, decorationExtension];

// ================ 键盘映射 ================
const PlaceholderKeyMap = keymap.of([
	{
		key: " ",
		run: (view: EditorView) => {
			const cursor = view.state.selection.main.head;
			const line = view.state.doc.lineAt(cursor);
			
			if (line.text.trim().length === 0) {
				const promptManager = createPromptInputManager(view);
				promptManager.show();
				return true;
			}
			return false;
		},
	},
]);

// ================ AI 操作管理器类 ================
class AIOperationsManager {
	private _pluginInstance: AIPlugin | null = null;
	private _abortController: AbortController | null = null;

	cleanup() {
		// this._pluginInstance = null;
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
	}

	setPlugin(plugin: AIPlugin) {
		this._pluginInstance = plugin;
	}

	getPlugin() {
		return this._pluginInstance;
	}

	async startAI(view: EditorView, prompt: string) {
		const cursor = view.state.selection.main.head;
		const originalLine = view.state.doc.lineAt(cursor);
		
		if (!this.validatePluginInstance()) return;
		
		const notice = new Notice("AI 正在思考中...", 0);
		const { settings, provider } = this.getSettings();
		
		if (!this.validateSettings(settings, provider, notice)) return;
		
		const originalView = view;
		const originalEditor = this.getOriginalEditor();
		if (!originalEditor) return;

		await this.handleAIRequest(
			originalView, 
			originalLine, 
			originalEditor, 
			settings, 
			provider, 
			prompt, 
			notice
		);
	}

	private validatePluginInstance(): boolean {
		if (!this._pluginInstance) {
			console.error('Plugin instance not found');
			return false;
		}
		return true;
	}

	private getSettings() {
		const settings = this._pluginInstance!.settings;
		const provider = AI_PROVIDERS.find(p => p.id === settings.provider);
		return { settings, provider };
	}

	private validateSettings(settings: any, provider: any, notice: Notice): boolean {
		if (!provider) {
			console.error('AI provider not found');
			notice.hide();
			return false;
		}

		if (!settings.apiKey) {
			console.error('API key not set');
			notice.hide();
			return false;
		}

		return true;
	}

	private getOriginalEditor() {
		const editor = this._pluginInstance?.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor) {
			console.error('Editor not found');
		}
		return editor;
	}

	private async handleAIRequest(
		view: EditorView,
		line: { from: number },
		originalEditor: any,
		settings: any,
		provider: any,
		prompt: string,
		notice: Notice
	) {
		this.setupAbortController();
		const headers = this.buildHeaders(settings);
		const requestBody = this.buildRequestBody(settings, prompt);

		try {
			const response = await this.makeRequest(settings, provider, headers, requestBody);
			await this.handleStreamResponse(response, view, line, originalEditor, notice);
		} catch (error) {
			this.handleError(error, notice);
		} finally {
			this.cleanup();
			notice.hide();
		}
	}

	private setupAbortController() {
		if (this._abortController) {
			this._abortController.abort();
		}
		this._abortController = new AbortController();
	}

	private buildHeaders(settings: any): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		switch (settings.provider) {
			case 'openai':
			case 'deepseek':
				headers['Authorization'] = `Bearer ${settings.apiKey}`;
				break;
			case 'claude':
				headers['x-api-key'] = settings.apiKey;
				headers['anthropic-version'] = '2023-06-01';
				break;
			case 'azure':
				headers['api-key'] = settings.apiKey;
				break;
			case 'chatglm':
				headers['Authorization'] = settings.apiKey;
				break;
			default:
				headers['Authorization'] = `Bearer ${settings.apiKey}`;
		}

		return headers;
	}

	private buildRequestBody(settings: any, prompt: string) {
		return {
			model: settings.model,
			messages: [{ role: 'user', content: prompt }],
			stream: true,
			temperature: settings.temperature,
			...(settings.provider === 'claude' && { max_tokens: 1000 })
		};
	}

	private async makeRequest(settings: any, provider: any, headers: any, body: any) {
		try {
			const params: RequestUrlParam = {
				url: settings.apiEndpoint || provider.baseUrl,
				method: "POST",
				headers,
				body: JSON.stringify(body),
				throw: true
			};

			const response = await requestUrl(params);
			return response;
		} catch (error) {
			console.error('Request failed:', error);
			throw new Error(`API request failed: ${error.message}`);
		}
	}

	private async handleStreamResponse(
		response: any,
		view: EditorView,
		line: { from: number },
		originalEditor: any,
		notice: Notice
	) {
		// requestUrl 返回的响应格式与 fetch 不同
		// 需要先解析响应文本
		const responseText = response.text;
		const lines = responseText.split('\n');
		let currentPosition = line.from;

		view.dispatch({
			changes: {
				from: line.from,
				to: line.from,
				insert: '',
			},
		});

		try {
			for (const line of lines) {
				if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

				try {
					const content = this.parseChunkContent(line);
					if (content) {
						if (!this.isEditorValid(originalEditor)) {
							return;
						}

						view.dispatch({
							changes: {
								from: currentPosition,
								to: currentPosition,
								insert: content
							}
						});
						
						currentPosition += content.length;
					}
				} catch (e) {
					console.error('Error parsing line:', e);
				}
			}
		} catch (error) {
			console.error('Error processing response:', error);
			throw error;
		}
	}

	private parseChunkContent(line: string): string {
		try {
			const data = JSON.parse(line.replace(/^data: /, ''));
			const settings = this._pluginInstance!.settings;

			switch (settings.provider) {
				case 'claude':
					return data.type === 'content_block_delta' ? data.delta.text : '';
				case 'chatglm':
					return data.choices[0].delta.content || '';
				default: // OpenAI 格式
					return data.choices[0].delta.content || '';
			}
		} catch (e) {
			console.error('Error parsing chunk:', e);
			return '';
		}
	}

	private isEditorValid(originalEditor: any): boolean {
		const currentEditor = this._pluginInstance?.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (currentEditor !== originalEditor) {
			console.log('Editor changed, aborting stream');
			return false;
		}
		return true;
	}

	private handleError(error: any, notice: Notice) {
		if (error.name === 'AbortError') {
			console.log('AI 请求已取消');
		} else {
			console.error("启动AI失败:", error);
		}
		notice.hide();
	}
}

// ================ 导出 ================
export const PlaceholderPluginActions = new AIOperationsManager();

export const PlaceholderPlugin: Extension[] = [
	...PlaceholderPluginExtension,
	PlaceholderKeyMap
];
