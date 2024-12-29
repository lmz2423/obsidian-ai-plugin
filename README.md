# Obsidian AI Plugin

[English](#english) | [中文](#中文)

# English

A powerful AI assistant plugin for Obsidian that helps you create and manage notes more efficiently.

## Features

- **Smart AI Assistant**: Press and hold the space key in an empty line to invoke the AI assistant
- **Flowchart Generation**: Quickly convert text descriptions into Mermaid flowcharts
- **Multiple AI Providers**: Support for various AI service providers:
  - OpenAI
  - Claude
  - DeepSeek
  - Azure OpenAI
  - ChatGLM

## Installation

1. Open Settings in Obsidian
2. Go to "Third-party plugins"
3. Turn off "Safe mode"
4. Click "Browse" and search for "AI Plugin"
5. Click Install
6. Enable the plugin

## Usage

1. **Basic Usage**:
   - Press and hold space key in any empty line
   - Enter your prompt
   - Press Enter to get AI response

2. **Flowchart Generation**:
   - Select "Add Flowchart" from the dropdown menu
   - Enter flowchart description
   - Preview and confirm the generated flowchart

3. **Configuration**:
   - Choose AI provider
   - Set API key
   - Configure model and other parameters

## Configuration Guide

1. Go to plugin settings page
2. Select your preferred AI provider
3. Enter the corresponding API key
4. (Optional) Configure custom API endpoint
5. (Optional) Select specific model

## Local Development

1. Clone repository:
\`\`\`bash
git clone [repository-url]
cd obsidian-ai-plugin
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Development mode:
\`\`\`bash
npm run dev
\`\`\`

4. Local testing:
To test the plugin in local Obsidian:
   - Create a test vault in Obsidian
   - Locate the plugins directory:
     - macOS: {vault}/.obsidian/plugins/
   - Create a new folder: obsidian-ai-plugin
   - Create symbolic links:
\`\`\`bash
ln -s $(pwd)/dist/main.js [vault-path]/.obsidian/plugins/obsidian-ai-plugin/main.js
ln -s $(pwd)/dist/manifest.json [vault-path]/.obsidian/plugins/obsidian-ai-plugin/manifest.json
ln -s $(pwd)/dist/styles.css [vault-path]/.obsidian/plugins/obsidian-ai-plugin/styles.css
\`\`\`

## Important Notes

1. Ensure you have valid AI service API keys before use
2. Stable network connection recommended
3. Be aware of API call costs and limitations

## Privacy Statement

- Plugin only sends necessary prompts to AI services when required
- No personal information is collected or stored
- API keys are stored locally only

## Contributing

Pull Requests and Issues are welcome. Before submitting, please:

1. Ensure code follows project style guidelines
2. Add necessary tests
3. Update relevant documentation

## License

[MIT License](LICENSE)

---

# 中文

一个强大的 Obsidian AI 助手插件，帮助你更高效地创建和管理笔记。

## 功能特点

- **智能 AI 助手**：在空行按住空格键即可唤起 AI 助手
- **流程图生成**：快速将文本描述转换为 Mermaid 流程图
- **多种 AI 提供商**：支持多个 AI 服务提供商：
  - OpenAI
  - Claude
  - DeepSeek
  - Azure OpenAI
  - ChatGLM

## 安装方法

1. 在 Obsidian 中打开设置
2. 进入 "第三方插件"
3. 关闭 "安全模式"
4. 点击 "浏览" 并搜索 "AI Plugin"
5. 点击安装
6. 启用插件

## 使用方法

1. **基础使用**：
   - 在任意空行按住空格键
   - 输入你的提示词
   - 按 Enter 键获取 AI 响应

2. **流程图生成**：
   - 在下拉菜单中选择 "添加流程图"
   - 输入流程图描述
   - 预览并确认生成的流程图

3. **配置设置**：
   - 选择 AI 提供商
   - 设置 API 密钥
   - 配置模型和其他参数

## 配置说明

1. 进入插件设置页面
2. 选择你想使用的 AI 提供商
3. 输入对应的 API 密钥
4. （可选）配置自定义 API 端点
5. （可选）选择特定的模型

## 本地开发

1. 克隆仓库：
\`\`\`bash
git clone [repository-url]
cd obsidian-ai-plugin
\`\`\`

2. 安装依赖：
\`\`\`bash
npm install
\`\`\`

3. 开发模式：
\`\`\`bash
npm run dev
\`\`\`

4. 本地测试：
为了在本地 Obsidian 中测试插件，你需要：
   - 在 Obsidian 中创建一个测试 vault
   - 找到 vault 的插件目录：
     - macOS: {vault}/.obsidian/plugins/
   - 在插件目录中创建一个新文件夹：obsidian-ai-plugin
   - 创建符号链接：
\`\`\`bash
ln -s $(pwd)/dist/main.js [vault-path]/.obsidian/plugins/obsidian-ai-plugin/main.js
ln -s $(pwd)/dist/manifest.json [vault-path]/.obsidian/plugins/obsidian-ai-plugin/manifest.json
ln -s $(pwd)/dist/styles.css [vault-path]/.obsidian/plugins/obsidian-ai-plugin/styles.css
\`\`\`

## 注意事项

1. 使用前请确保你有有效的 AI 服务 API 密钥
2. 建议使用稳定的网络连接
3. 注意 API 调用的费用和限制

## 隐私说明

- 插件仅在需要时发送必要的提示词到 AI 服务
- 不会收集或存储任何个人信息
- API 密钥仅存储在本地

## 贡献指南

欢迎提交 Pull Requests 或提出 Issues。在提交之前，请：

1. 确保代码符合项目的代码风格
2. 添加必要的测试
3. 更新相关文档

## 许可证

[MIT License](LICENSE)
