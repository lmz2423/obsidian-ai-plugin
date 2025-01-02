<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="prompt-input-wrapper"
      :style="positionStyle"
    >
      <input
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
      <!-- 这里可以添加更多UI元素，比如按钮、历史记录等 -->
    </div>
  </Teleport> 
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { EditorView } from '@codemirror/view'

const props = defineProps<{
  view: EditorView
}>()

const visible = ref(false)
const promptText = ref('')
const inputRef = ref<HTMLInputElement>()

// 计算输入框位置
const positionStyle = computed(() => {
  if (!visible.value) return {}
  
  const cursor = props.view.state.selection.main.head
  const coords = props.view.coordsAtPos(cursor)
  
  return {
    position: 'absolute',
    zIndex: 999,
    left: coords ? `${coords.left}px` : '0',
    top: coords ? `${coords.top}px` : '0',
    width: '500px'
  }
})

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    const prompt = promptText.value.trim()
    if (prompt) {
      hide()
      // 将直接调用改为事件触发
      emit('start-ai', prompt)
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
    hide()
  }
  event.stopPropagation()
}

// 显示输入框
const show = () => {
  visible.value = true
  promptText.value = ''
  // 等待 DOM 更新后聚焦
  setTimeout(() => {
    inputRef.value?.focus()
  }, 0)
}

// 隐藏输入框
const hide = () => {
  visible.value = false
  promptText.value = ''
}

// 处理点击外部关闭
const handleOutsideClick = (event: MouseEvent) => {
  if (visible.value && inputRef.value && !inputRef.value.contains(event.target as Node)) {
    hide()
  }
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

// 暴露方法给父组件
defineExpose({
  show,
  hide
})

const emit = defineEmits<{
  close: [], // 空数组表示这个事件不需要参数
  'start-ai': [prompt: string] // 新增 start-ai 事件
}>()
</script>

<style scoped>
.prompt-input-wrapper {
  background: var(--background-primary);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.prompt-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-normal);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
}

.prompt-input:focus {
  border-color: var(--interactive-accent);
}
</style> 
