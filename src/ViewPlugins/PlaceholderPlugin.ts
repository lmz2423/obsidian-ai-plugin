import {
	Decoration,
	WidgetType,
	ViewPlugin,
	ViewUpdate,
	DecorationSet,
	keymap,
	EditorView,
	PluginValue,
	PluginSpec
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type AIPlugin from "../main";
import { AI_PROVIDERS } from "../settings";
import { MarkdownView, Notice } from "obsidian";

// 定义 StateEffect
const addPromptInputEffect = StateEffect.define<DecorationSet>();

class PlaceholderWidget extends WidgetType {
	toDOM() {
		const span = document.createElement("span");
		span.textContent = " 按空格键启动AI";
		span.style.color = "rgba(0,0,0,0.3)";
		span.style.pointerEvents = "none";
		span.style.position = "absolute";
		span.style.left = "4px";
		span.style.top = "50%";
		span.style.transform = "translateY(-50%)";
		span.style.fontStyle = "italic";
		return span;
	}
}

class PromptInputWidget extends WidgetType {
	private view: EditorView;
	private input: HTMLInputElement | null = null;

	constructor(view: EditorView) {
		super();
		this.view = view;
	}

	toDOM() {
		const wrapper = document.createElement("div");
		wrapper.style.position = "absolute";
		wrapper.style.zIndex = "999";
		
		// 获取光标位置
		const cursor = this.view.state.selection.main.head;
		const coords = this.view.coordsAtPos(cursor);
		
		if (coords) {
			wrapper.style.left = `${coords.left}px`;
			wrapper.style.top = `${coords.top}px`;
			wrapper.style.width = '500px';
		}
		
		// 创建输入框
		this.input = document.createElement("input");
		this.input.type = "text";
		this.input.placeholder = "请输入你的prompt";
		this.input.className = "ai-prompt-input";
		
		// 设置输入框样式
		this.input.style.cssText = `
			border: 1px solid var(--background-modifier-border);
			border-radius: 10px;
			padding: 4px 8px;
			font-size: 14px;
			height: var(--input-height);
			line-height: 1.5;
			width: calc(100% - 16px);
			background: var(--background-primary);
			color: var(--text-normal);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			margin: 0;
			position: relative;
			outline: none;
			display: block;
		`;

		// 添加事件监听
		this.input.addEventListener("keydown", this.handleKeyDown.bind(this));
		
		// 防止事件冒泡到编辑器
		this.input.addEventListener("keyup", (e) => e.stopPropagation());
		this.input.addEventListener("keypress", (e) => e.stopPropagation());
		this.input.addEventListener("mousedown", (e) => e.stopPropagation());
		this.input.addEventListener("mouseup", (e) => e.stopPropagation());
		this.input.addEventListener("click", (e) => e.stopPropagation());
		
		// 点击外部区域时关闭输入框
		document.addEventListener("click", (e) => {
			if (e.target !== this.input) {
				this.destroy();
			}
		}, { once: true });
		
		// 自动聚焦
		setTimeout(() => this.input?.focus(), 0);
		
		wrapper.appendChild(this.input);
		return wrapper;
	}

	private handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.isComposing) {
			event.preventDefault();
			const prompt = this.input?.value.trim();
			if (prompt) {
				// 移除输入框
				this.destroy();
				// 启动 AI 并传入 prompt
				PlaceholderPluginActions.startAI(this.view, prompt);
			}
		} else if (event.key === "Escape") {
			event.preventDefault();
			// 移除输入框
			this.destroy();
		}
		event.stopPropagation();
	}

	destroy() {
		const parent = this.input?.parentElement;
		if (parent) {
			parent.remove();
		}
	}
}

interface PlaceholderPluginValue extends PluginValue {
	decorations: DecorationSet;
}

class PlaceholderPluginClass implements PlaceholderPluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.computeDecorations(view);
	}

	update(update: ViewUpdate) {
		// 处理 StateEffect
		for (const tr of update.transactions) {
			for (const effect of tr.effects) {
				if (effect.is(addPromptInputEffect)) {
					this.decorations = effect.value;
					return;
				}
			}
		}

		if (update.docChanged || update.selectionSet) {
			this.decorations = this.computeDecorations(update.view);
		}
	}

	computeDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const cursor = view.state.selection.main.head;
		const line = view.state.doc.lineAt(cursor);
		const isEmpty = line.text.trim().length === 0;

		if (isEmpty) {
			const deco = Decoration.widget({
				widget: new PlaceholderWidget(),
				side: -1
			});
			builder.add(line.from, line.from, deco);
		}

		return builder.finish();
	}
}

const basePlugin = ViewPlugin.fromClass(PlaceholderPluginClass, {
	decorations: v => v.decorations
});

const decorationExtension = EditorView.decorations.of((view: EditorView): DecorationSet => {
	const pluginInstance = view.plugin(basePlugin) as PlaceholderPluginValue | null;
	return pluginInstance?.decorations || Decoration.none;
});

const PlaceholderPluginExtension = [basePlugin, decorationExtension];

// 清理已存在的输入框
function cleanupExistingInputs() {
	const existingInputs = document.querySelectorAll('.ai-prompt-input');
	existingInputs.forEach(input => {
		const parent = input.parentElement;
		if (parent) parent.remove();
	});
}

const PlaceholderKeyMap = keymap.of([
	{
		key: " ",
		preventDefault: true,
		run: (view: EditorView) => {
			const cursor = view.state.selection.main.head;
			const line = view.state.doc.lineAt(cursor);
			const isEmpty = line.text.trim().length === 0;
			if (isEmpty) {
				console.log("空行中按下了空格键，显示提示词输入框");
				
				// 清理已存在的输入框
				cleanupExistingInputs();
				
				// 直接创建并添加输入框到 DOM
				const promptWidget = new PromptInputWidget(view);
				const dom = promptWidget.toDOM();
				document.body.appendChild(dom);
				
				return true;
			}
			return false;
		},
	},
]);

export const PlaceholderPlugin: Extension[] = [
	...PlaceholderPluginExtension,
	PlaceholderKeyMap
];

// 将 AI 相关的操作放在一个单独的模块中，方便管理和访问
export const PlaceholderPluginActions = {
	_pluginInstance: null as AIPlugin | null,
	_abortController: null as AbortController | null,

	cleanup() {
		this._pluginInstance = null;
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
	},

	startAI: async (view: EditorView, prompt: string) => {
		const cursor = view.state.selection.main.head;
		const originalLine = view.state.doc.lineAt(cursor);
		
		// 检查插件实例和设置
		if (!PlaceholderPluginActions._pluginInstance) {
			console.error('Plugin instance not found');
			return;
		}

		// 显示思考中的提示
		const notice = new Notice("AI 正在思考中...", 0);

		const settings = PlaceholderPluginActions._pluginInstance.settings;
		const provider = AI_PROVIDERS.find(p => p.id === settings.provider);

		if (!provider) {
			console.error('AI provider not found');
			notice.hide();
			return;
		}

		if (!settings.apiKey) {
			console.error('API key not set');
			notice.hide();
			return;
		}

		// 保存当前视图的引用
		const originalView = view;
		const originalEditor = PlaceholderPluginActions._pluginInstance.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!originalEditor) {
			console.error('Editor not found');
			return;
		}

		// 如果有正在进行的请求，先取消
		if (PlaceholderPluginActions._abortController) {
			PlaceholderPluginActions._abortController.abort();
		}
		
		// 创建新的 AbortController
		PlaceholderPluginActions._abortController = new AbortController();

		// 构建请求头
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// 根据不同提供商设置不同的认证头
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

		// 构建请求体
		const requestBody = {
			model: settings.model,
			messages: [{ role: 'user', content: prompt }],
			stream: true,
			...(settings.provider === 'claude' && { max_tokens: 1000 })
		};
		
		try {
			const response = await fetch(settings.apiEndpoint || provider.baseUrl, {
				method: "POST",
				headers,
				body: JSON.stringify(requestBody),
				signal: PlaceholderPluginActions._abortController.signal
			});

			if (!response.ok) {
				notice.hide();
				throw new Error(`API request failed: ${response.statusText}`);
			}

			if (!response.body) {
				notice.hide();
				throw new Error('Response body is null');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let accumulatedContent = '';
			let isFirstChunk = true;

			// 创建初始空行
			originalView.dispatch({
				changes: {
					from: originalLine.from,
					to: originalLine.from,
					insert: '',
				},
			});

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				// 解码二进制数据
				const chunk = decoder.decode(value, { stream: true });
				
				// 处理数据块
				const lines = chunk.split('\n');
				for (const line of lines) {
					if (line.trim() === '') continue;
					if (line.trim() === 'data: [DONE]') continue;
					
					try {
						const data = JSON.parse(line.replace(/^data: /, ''));
						let content = '';
						
						// 根据不同提供商解析流式响应
						switch (settings.provider) {
							case 'claude':
								content = data.type === 'content_block_delta' ? data.delta.text : '';
								break;
							case 'chatglm':
								content = data.choices[0].delta.content || '';
								break;
							default: // OpenAI 格式
								content = data.choices[0].delta.content || '';
						}

						if (content) {
							// 当收到第一个内容时隐藏提示
							if (isFirstChunk) {
								notice.hide();
								isFirstChunk = false;
							}

							// 检查编辑器状态
							const currentEditor = PlaceholderPluginActions._pluginInstance?.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
							if (currentEditor !== originalEditor) {
								console.log('Editor changed, aborting stream');
								reader.cancel();
								return;
							}

							// 累积内容
							accumulatedContent += content;

							// 更新编辑器内容
							originalView.dispatch({
								changes: {
									from: originalLine.from,
									to: originalLine.from + accumulatedContent.length - content.length,
									insert: accumulatedContent,
								},
							});
						}
					} catch (e) {
						console.error('Error parsing stream:', e);
					}
				}
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('AI 请求已取消');
			} else {
				console.error("启动AI失败:", error);
			}
			notice.hide();
		} finally {
			if (PlaceholderPluginActions._abortController) {
				PlaceholderPluginActions._abortController = null;
			}
			notice.hide();
		}
	},

	setPlugin: (plugin: AIPlugin) => {
		PlaceholderPluginActions._pluginInstance = plugin;
	},

	getPlugin: () => {
		return PlaceholderPluginActions._pluginInstance;
	}
};
