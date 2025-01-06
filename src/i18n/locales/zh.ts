export default {
    settings: {
        provider: {
            name: 'AI 提供商',
            desc: '选择 AI 服务提供商'
        },
        model: {
            name: 'AI 模型',
            desc: '选择 AI 模型'
        },
        apiKey: {
            name: 'API 密钥',
            desc: '输入当前提供商的 API 密钥'
        },
        apiEndpoint: {
            name: 'API 端点',
            desc: '输入 API 端点地址（可选，留空使用默认值）'
        },
        temperature: {
            name: '随机性',
            desc: '调整模型输出的随机性 (0.0-2.0)'
        },
        streamMode: {
            name: '流式响应',
            desc: '是否使用流式响应模式（更快的响应，但可能不稳定）'
        },
        resetEndpoint: {
            name: '重置 API 端点',
            desc: '恢复默认 API 端点',
            button: '重置'
        }
    },
    notice: {
        thinking: 'AI 正在思考中...',
        networkError: '网络连接错误。建议在设置中关闭流式响应模式后重试。\n错误信息: ',
        apiKeyInvalid: 'API 密钥无效',
        tooManyRequests: '请求过于频繁，请稍后再试',
        serverError: '服务器错误，请稍后再试',
        serviceUnavailable: '服务暂时不可用，请稍后再试',
        requestFailed: '请求失败: ',
        unknownError: '未知错误'
    },
    placeholder: {
        input: ' 按下空格键启动AI'
    }
}; 
