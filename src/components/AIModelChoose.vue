<script lang="ts" setup>
import { ref } from "vue";

export interface SystemModel {
	label: string;
	value: string;
}

const props = withDefaults(
	defineProps<{
		currentModel: SystemModel;
		modelList: SystemModel[];
	}>(),
	{
		currentModel: () => ({
			value: "deepseek",
			label: "DeepSeek",
		}),
		modelList: () => [
			{ value: "deepseek", label: "DeepSeek" },
			{ value: "claude", label: "Claude" },
			{ value: "gpt4o", label: "GPT-4o" },
		],
	}
);

const model = ref(props.currentModel.value);


const emit = defineEmits<{
	(e: 'update:currentModel', value: SystemModel): void;
}>();

const handleChange = (value: string) => {
	const newModel = props.modelList.find(m => m.value === value);
	if (newModel) {
		emit('update:currentModel', newModel);
	}
};
</script>

<template>
	<el-select
		v-model="model"
		filterable
		@change="handleChange"
		class="ai-model-choose"
		:popper-class="'ai-model-select-dropdown'"
		size="small"
		:show-arrow="false"
		:offset="0"
	>
		<el-option
			v-for="item in modelList"
			:key="item.value"
			:label="item.label"
			:value="item.value"
		>
			<slot name="dropdown-item" :item="item">
				<span class="dropdown-item-text">{{ item.label }}</span>
			</slot>
		</el-option>
	</el-select>
</template>

<style lang="css">
.ai-model-choose {
	width: 80px;
}
.dropdown-item-text {
	display: block;
	font-size: 10px;
}
.el-select__placeholder{
	z-index: auto;
	color: var(--color-base-70);
}
.el-select__input{
	border: none;
}

.el-select__wrapper{
   border: none;
   border-radius: 0;
   box-shadow: none;
}

.el-select__wrapper.is-focused {
    box-shadow: none;
}
.el-select__wrapper.is-hovering:not(.is-focused){
	box-shadow: none;
}
.el-select-dropdown__item.is-selected{
	color:var(--el-text-color-regular)
}
.el-select-dropdown__item {
	line-height: 2;
	height: 20px;
	padding: 0 8px;
}
input[type="text"].el-select__input{
	border: none;
}
input[type="text"]:focus-visible.el-select__input{
	box-shadow: 0 0 0 1px var(--background-modifier-border-focus);
	border-radius: 2px;
}
.el-popper{ 
	border-radius: 0;
}
</style>
