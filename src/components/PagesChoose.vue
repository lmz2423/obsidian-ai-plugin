<script lang="ts" setup>
import { ref } from "vue";
import { debounce } from "lodash-es";

// 修改接口定义支持分组
export interface PageOption {
	label: string;
	value: string;
}

export interface PageGroup {
	label: string;
	options: PageOption[];
}

const props = withDefaults(
	defineProps<{
		selectedPages: string[];
		// 改为接收初始选项和加载方法
		initialOptions?: PageGroup[];
		onSearch?: (query: string) => Promise<PageGroup[]>;
	}>(),
	{
		selectedPages: () => [],
		initialOptions: () => [],
	}
);

const selectedKeys = ref<string[]>(props.selectedPages);
const options = ref<PageGroup[]>(props.initialOptions);
const loading = ref(false);

const emit = defineEmits<{
	(e: "update:selectedPages", value: string[]): void;
}>();

// 修改远程搜索处理
const remoteSearch = debounce(async (query: string) => {
	if (!props.onSearch) return;

	loading.value = true;
	try {
		// 直接使用后端返回的结果，不做本地过滤
		options.value = await props.onSearch(query);
	} catch (error) {
		console.error("Failed to search pages:", error);
		options.value = [];
	} finally {
		loading.value = false;
	}
}, 300);

const handleChange = (value: string[]) => {
	emit("update:selectedPages", value);
};
</script>

<template>
	<el-select
		v-model="selectedKeys"
		remote
		filterable
		:remote-method="remoteSearch"
		:loading="loading"
		class="pages-choose"
		:popper-class="'pages-choose-dropdown'"
		size="small"
		:show-arrow="false"
		:offset="0"
		@change="handleChange"
		placeholder="选择页面"
		:no-data-text="loading ? '搜索中...' : '无匹配页面'"
	>
		<template #prefix v-if="loading">
			<el-icon class="el-input__icon"><i-loading /></el-icon>
		</template>

		<!-- 添加分组选项渲染 -->
		<el-option-group
			v-for="group in options"
			:key="group.label"
			:label="group.label"
		>
			<el-option
				v-for="item in group.options"
				:key="item.value"
				:label="item.label"
				:value="item.value"
			/>
		</el-option-group>
	</el-select>
</template>

<style lang="css">
.pages-choose {
	width: 100px;
	max-width: 200px;
}

.tree-node {
	font-size: 12px;
	line-height: 24px;
}

.pages-choose-dropdown .el-tree-node__content {
	height: 24px;
}

.pages-choose-dropdown .el-tree {
	background: var(--background-primary);
	color: var(--text-normal);
}

.pages-choose-dropdown .el-tree-node:focus > .el-tree-node__content {
	background-color: var(--background-modifier-hover);
}

.pages-choose-dropdown .el-tree-node__content:hover {
	background-color: var(--background-modifier-hover);
}

.pages-choose-dropdown .el-select-dropdown__item.selected {
	color: var(--text-normal);
	font-weight: normal;
}

.el-select__tags {
	flex-wrap: nowrap;
	overflow: hidden;
}

.el-select__tags-text {
	display: inline-block;
	max-width: 80px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 继承 AIModelChoose 的基础样式 */
.el-select__wrapper {
	border: none;
	border-radius: 0;
	box-shadow: none;
}

.el-select__wrapper.is-focused {
	box-shadow: none;
}

.el-select__wrapper.is-hovering:not(.is-focused) {
	box-shadow: none;
}

input[type="text"].el-select__input {
	border: none;
}

input[type="text"]:focus-visible.el-select__input {
	box-shadow: 0 0 0 1px var(--background-modifier-border-focus);
	border-radius: 2px;
}

.el-popper {
	border-radius: 0;
}

/* 添加加载图标样式 */
.el-input__icon {
	font-size: 14px;
	color: var(--text-muted);
}

@keyframes rotating {
	0% {
		transform: rotate(0deg);
	}

	100% {
		transform: rotate(360deg);
	}
}

.i-loading {
	animation: rotating 2s linear infinite;
}
</style>
