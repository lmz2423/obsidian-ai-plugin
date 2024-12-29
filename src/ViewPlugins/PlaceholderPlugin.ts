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
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type AIPlugin from "../main";
import { AI_PROVIDERS } from "../settings";
import { MarkdownView } from "obsidian";

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

interface PlaceholderPluginValue extends PluginValue {
	decorations: DecorationSet;
}

class PlaceholderPluginClass implements PlaceholderPluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.computeDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.selectionSet) {
			console.log("Plugin update triggered.");
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

const PlaceholderKeyMap = keymap.of([
	{
		key: " ",
		preventDefault: true,
		run: (view: EditorView) => {
			const cursor = view.state.selection.main.head;
			const line = view.state.doc.lineAt(cursor);
			const isEmpty = line.text.trim().length === 0;
			if (isEmpty) {
				console.log("空行中按下了空格键，启动AI (使用 keymap)");
				PlaceholderPluginActions.startAI(view);
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

	startAI: async (view: EditorView) => {
		const cursor = view.state.selection.main.head;
		const originalLine = view.state.doc.lineAt(cursor);
		
		// 检查插件实例和设置
		if (!PlaceholderPluginActions._pluginInstance) {
			console.error('Plugin instance not found');
			return;
		}

		const settings = PlaceholderPluginActions._pluginInstance.settings;
		const provider = AI_PROVIDERS.find(p => p.id === settings.provider);

		if (!provider) {
			console.error('AI provider not found');
			return;
		}

		if (!settings.apiKey) {
			console.error('API key not set');
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
			messages: [{ role: 'user', content: "用户启动AI" }],
			stream: true, // 启用流式输出
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
				throw new Error(`API request failed: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let accumulatedContent = '';

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
				return;
			}
			console.error("启动AI失败:", error);
		} finally {
			if (PlaceholderPluginActions._abortController) {
				PlaceholderPluginActions._abortController = null;
			}
		}
	},

	setPlugin: (plugin: AIPlugin) => {
		PlaceholderPluginActions._pluginInstance = plugin;
	},

	getPlugin: () => {
		return PlaceholderPluginActions._pluginInstance;
	}
};
