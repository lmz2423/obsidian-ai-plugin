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
			const response = await fetch(settings.apiEndpoint || provider.baseUrl, {
				method: "POST",
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${settings.apiKey}`,
				},
				body: JSON.stringify({
					model: settings.model,
					messages: body.messages,
					stream: true,
					temperature: settings.temperature,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
			}

			return response;
		} catch (error) {
			console.error('Request failed:', error);
			throw error;
		}
	}

	private async handleStreamResponse(
		response: Response,
		view: EditorView,
		line: { from: number },
		originalEditor: any,
		notice: Notice
	) {
		let currentPosition = line.from;

			view.dispatch({
				changes: {
					from: line.from,
					to: line.from,
					insert: '',
				},
			});

		try {
			const reader = response.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim() || line === 'data: [DONE]') continue;
					
					try {
						const jsonString = line.replace(/^data: /, '');
						const json = JSON.parse(jsonString);
						const content = json.choices?.[0]?.delta?.content || '';

						if (content && this.isEditorValid(originalEditor)) {
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
						console.error('Error parsing stream data:', e);
					}
				}
			}

			// 处理最后可能剩余的数据
			if (buffer.trim() && buffer !== 'data: [DONE]') {
				try {
					const jsonString = buffer.replace(/^data: /, '');
					const json = JSON.parse(jsonString);
					const content = json.choices?.[0]?.delta?.content || '';

					if (content && this.isEditorValid(originalEditor)) {
						view.dispatch({
							changes: {
								from: currentPosition,
								to: currentPosition,
								insert: content
							}
						});
					}
				} catch (e) {
					console.error('Error parsing final buffer:', e);
				}
			}
		} catch (error) {
			console.error('Error processing stream:', error);
			throw error;
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
		let errorMessage = '未知错误';

		if (error.name === 'AbortError') {
			errorMessage = 'AI 请求已取消';
		} else if (error.status) {
			switch (error.status) {
				case 401:
					errorMessage = 'API Key 无效';
					break;
				case 429:
					errorMessage = '请求过于频繁，请稍后再试';
					break;
				case 500:
					errorMessage = '服务器错误，请稍后再试';
					break;
				case 503:
					errorMessage = '服务暂时不可用，请稍后再试';
					break;
				default:
					errorMessage = `请求失败: ${error.status} ${error.message || ''}`;
			}
		} else {
			errorMessage = error.message || '请求失败';
		}

		console.error("AI 请求失败:", error);
		new Notice(`AI 请求失败: ${errorMessage}`);
		notice.hide();
	}
}

// ================ 导出 ================
export const PlaceholderPluginActions = new AIOperationsManager();

export const PlaceholderPlugin: Extension[] = [
	...PlaceholderPluginExtension,
	PlaceholderKeyMap
];
