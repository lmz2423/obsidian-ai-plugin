export default {
    settings: {
        provider: {
            name: 'AI Provider',
            desc: 'Select AI service provider'
        },
        model: {
            name: 'AI Model',
            desc: 'Select AI model'
        },
        apiKey: {
            name: 'API Key',
            desc: 'Enter API key for current provider'
        },
        apiEndpoint: {
            name: 'API Endpoint',
            desc: 'Enter API endpoint (optional, leave empty for default)'
        },
        temperature: {
            name: 'Temperature',
            desc: 'Adjust model output randomness (0.0-2.0)'
        },
        streamMode: {
            name: 'Stream Mode',
            desc: 'Use streaming response (faster but may be unstable)'
        },
        resetEndpoint: {
            name: 'Reset API Endpoint',
            desc: 'Restore default API endpoint',
            button: 'Reset'
        }
    },
    notice: {
        thinking: 'AI is thinking...',
        networkError: 'Network error. Consider disabling Stream Mode in settings.\nError: ',
        apiKeyInvalid: 'Invalid API Key',
        tooManyRequests: 'Too many requests, please try again later',
        serverError: 'Server error, please try again later',
        serviceUnavailable: 'Service temporarily unavailable',
        requestFailed: 'Request failed: ',
        unknownError: 'Unknown error'
    },
    placeholder: {
        input: ' Press space to activate AI'
    }
}; 
