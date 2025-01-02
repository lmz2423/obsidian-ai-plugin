import { createApp } from 'vue'
import type { App } from '@vue/runtime-core'
import { EditorView } from '@codemirror/view'
import PromptInput from '../components/PromptInput.vue'
import { PlaceholderPluginActions } from '../ViewPlugins/PlaceholderPlugin'
export class PromptInputManager {
  private vueApp: App | null = null
  private container: HTMLElement | null = null
  private componentInstance: InstanceType<typeof PromptInput> | null = null

  constructor(private view: EditorView) {}

  show() {
    // 清理已存在的实例
    this.cleanup()

    // 创建容器
    this.container = document.createElement('div')
    document.body.appendChild(this.container)

    // 创建 Vue 实例，添加 start-ai 事件处理
    this.vueApp = createApp(PromptInput, {
      view: this.view,
      onClose: () => this.cleanup(),
      'onStart-ai': (prompt: string) => {
        // 调用 AI 插件
		PlaceholderPluginActions.startAI(this.view, prompt)
      }
    })

    // 挂载组件并获取组件实例
    this.componentInstance = this.vueApp.mount(this.container) as InstanceType<typeof PromptInput>

    // 显示输入框
    this.componentInstance.show()
  }

  cleanup() {
    // 先卸载 Vue 组件实例
    if (this.componentInstance) {
      this.componentInstance.hide()
    }
    
    if (this.vueApp) {
      this.vueApp.unmount()
      this.vueApp = null
    }

    // 确保从 DOM 中移除容器元素
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }

    this.componentInstance = null
  }

  // 提供销毁方法供外部调用
  destroy() {
    this.cleanup()
  }

  // 获取组件实例
  getInstance() {
    return this.componentInstance
  }
}

// 用于管理全局实例
let currentManager: PromptInputManager | null = null

// 清理全局实例的辅助函数
export function cleanupCurrentManager() {
  if (currentManager) {
    currentManager.destroy()
    currentManager = null
  }
}

// 创建新实例的工厂函数
export function createPromptInputManager(view: EditorView): PromptInputManager {
  cleanupCurrentManager()
  currentManager = new PromptInputManager(view)
  return currentManager
} 
