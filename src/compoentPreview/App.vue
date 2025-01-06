<template>
  <div class="app-container">
    <PromptInput ref="promptInputRef" :view="mockView" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PromptInput from '../components/PromptInput.vue'

// 创建一个模拟的 EditorView 对象用于预览
const mockView = {
  state: {
    selection: {
      main: {
        head: 0
      }
    }
  },
  coordsAtPos: () => ({
    left: 100,
    top: 100
  }),
  // 添加必要的 EditorView 属性
  viewport: { from: 0, to: 0 },
  visibleRanges: [{ from: 0, to: 0 }],
  inView: () => true,
  composing: false
} 

const promptInputRef = ref<InstanceType<typeof PromptInput> | null>(null)

// 组件挂载后自动显示
onMounted(() => {
  if (promptInputRef.value) {
    promptInputRef.value.show()
  }
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 
