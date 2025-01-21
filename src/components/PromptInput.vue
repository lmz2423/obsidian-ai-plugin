<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import type { EditorView } from "@codemirror/view";
import AIModelChoose, { SystemModel } from "./AIModelChoose.vue";
import PagesChoose from './PagesChoose.vue';
import { App, TFile } from 'obsidian';

interface Props {
	view: EditorView;
	app: App;
}

const props = defineProps<Props>();

const visible = ref(false);
const promptText = ref("");
const inputRef = ref<HTMLTextAreaElement>();

const currentModel = ref<SystemModel>({
	value: "deepseek",
	label: "DeepSeek",
});

const modelList = ref<SystemModel[]>([
	{ value: "deepseek", label: "DeepSeek" },
	{ value: "cladue-3.5-sonnet", label: "cladue-3.5-sonnet" },
	{ value: "gpt-4o", label: "gpt-4o" },
	{ value: "gpt-4o-mini", label: "gpt-4o-mini" },
	{ value: "gpt-4o-turbo", label: "gpt-4o-turbo" },
	{ value: "gemini-1.5-flash", label: "gemini-1.5-flash" },
	{ value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
]);

// 计算输入框位置
const positionStyle = computed(() => {
	if (!visible.value) return {};

	const cursor = props.view.state.selection.main.head;
	const coords = props.view.coordsAtPos(cursor);

	return {
		position: "absolute" as const,
		zIndex: 999,
		left: coords ? `${coords.left}px` : "0",
		top: coords ? `${coords.top}px` : "0",
		width: "500px",
	};
});

// 添加自动调整高度的方法
const adjustTextareaHeight = () => {
	const textarea = inputRef.value;
	if (!textarea) return;

	// 重置高度以获取正确的 scrollHeight
	textarea.style.height = "auto";
	// 设置新高度 (最小 32px，最大 200px)
	const newHeight = textarea.scrollHeight;
	textarea.style.height = `${newHeight}px`;
};

// 监听输入内容变化
watch(promptText, () => {
	// Check if browser supports fit-content using CSS.supports
	if (!CSS.supports("field-sizing", "content")) {
		nextTick(adjustTextareaHeight);
	}
});

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
	if (event.key === "Enter" && !event.isComposing) {
		event.preventDefault();
		const prompt = promptText.value.trim();
		if (prompt) {
			hide();
			// 将直接调用改为事件触发
			emit("start-ai", prompt);
		}
	} else if (event.key === "Escape") {
		event.preventDefault();
		hide();
	}
	event.stopPropagation();
};

// 显示输入框
const show = () => {
	visible.value = true;
	promptText.value = "";
	// 使用 nextTick 替代 setTimeout
	nextTick(() => {
		inputRef.value?.focus();
	});
};

// 隐藏输入框
const hide = () => {
	visible.value = false;
	promptText.value = "";
};

// 处理点击外部关闭
const handleOutsideClick = (event: MouseEvent) => {
	if (!visible.value) return;

	const wrapper = event.target as HTMLElement;
	// 检查点击是否在整个 prompt-input-wrapper 之外
	const isOutsideWrapper = !wrapper.closest(".prompt-input-wrapper");

	if (isOutsideWrapper) {
		hide();
	}
};

const handleModelChange = (model: SystemModel) => {
	nextTick(() => {
		inputRef.value?.focus();
	});
	console.log("xx", model);
};

// 组件挂载时添加事件监听
onMounted(() => {
	document.addEventListener("click", handleOutsideClick);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
	document.removeEventListener("click", handleOutsideClick);
});

// 暴露方法给父组件
defineExpose({
	show,
	hide,
});

const emit = defineEmits<{
	close: []; // 空数组表示这个事件不需要参数
	"start-ai": [prompt: string]; // 新增 start-ai 事件
}>();

// 添加选中页面的状态
const selectedPages = ref<string[]>([]);

// 添加类型定义
interface PageOption {
	label: string;
	value: string;
}

interface PageGroup {
	label: string;
	options: PageOption[];
}

// 修改搜索页面的方法
const handleSearchPages = async (query: string): Promise<PageGroup[]> => {
	try {
		// 使用 props.app 而不是直接使用 app
		const files = props.app.vault.getMarkdownFiles();
		
		const allPages: PageGroup[] = [{
			label: "最近的页面",
			options: files.map(file => ({
				label: file.basename,
				value: file.path
			}))
			.sort((a, b) => {
				const fileA = props.app.vault.getAbstractFileByPath(a.value) as TFile;
				const fileB = props.app.vault.getAbstractFileByPath(b.value) as TFile;
				return (fileB?.stat?.mtime || 0) - (fileA?.stat?.mtime || 0);
			})
			.slice(0, 10)
		}];

		if (!query) return allPages;

		return allPages.map(group => ({
			...group,
			options: group.options.filter(option => 
				option.label.toLowerCase().includes(query.toLowerCase())
			)
		})).filter(group => group.options.length > 0);
	} catch (error) {
		console.error('Failed to get markdown files:', error);
		return [];
	}
};
</script>
<template>
	<div v-if="visible" class="prompt-input-wrapper" :style="positionStyle">
		<textarea
			ref="inputRef"
			v-model="promptText"
			type="text"
			class="prompt-input"
			placeholder="请输入你的prompt"
			@keydown="handleKeyDown"
			@keyup.stop
			@keypress.stop
			@mousedown.stop
			@mouseup.stop
			@click.stop
		/>
		<div class="tools">
			<AIModelChoose
				:current-model="currentModel"
				:model-list="modelList"
				@update:currentModel="handleModelChange"
			/>
			<PagesChoose
				v-model:selectedPages="selectedPages"
				:on-search="handleSearchPages"
			/>
		</div>
	</div>
</template>

<style scoped>
.prompt-input-wrapper {
	padding: 8px;
	background: var(--background-primary);
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	border-color: #e0e0e0;
}

.prompt-input {
	width: 100%;
	padding: 8px 12px;
	background: transparent;
	color: var(--text-normal);
	font-size: 14px;
	line-height: 1.5;
	outline: none;
	height: auto;
	field-sizing: content;
	resize: none;
	scrollbar-width: none;
	box-sizing: border-box;
}

.prompt-input:focus {
	border-color: var(--interactive-accent);
}

.prompt-input::-webkit-scrollbar {
	display: none;
}

.tools {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 8px;
}
</style>
