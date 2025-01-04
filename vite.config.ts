import { defineConfig } from 'vite';
import { resolve } from 'path';
import builtins from 'builtin-modules';
import { existsSync, copyFileSync, mkdirSync, readFileSync } from 'fs';
import vue from '@vitejs/plugin-vue';

// 确保 dist 目录存在
if (!existsSync('dist')) {
    mkdirSync('dist');
}

// 复制必要文件到 dist
copyFileSync('manifest.json', 'dist/manifest.json');
if (existsSync('src/css/styles.css')) {
    console.log('初始化: 复制 styles.css 到 dist 目录');
    copyFileSync('src/css/styles.css', 'dist/styles.css');
}

// 用于缓存文件内容的变量
let lastStyleContent = existsSync('src/css/styles.css') ? readFileSync('src/css/styles.css', 'utf-8') : '';

// 创建基础构建配置
const baseConfig = {
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    // isCustomElement: (tag) => tag.includes('-')
                }
            }
        }),
        {
            name: 'watch-external',
            async buildStart() {
                if (process.env.NODE_ENV !== 'production') {
                    this.addWatchFile('src/css/styles.css');
                }
            },
            handleHotUpdate({ file, server }) {
                if (file.endsWith('styles.css')) {
                    const currentContent = readFileSync(file, 'utf-8');
                    // 只在文件内容真正变化时才更新
                    if (currentContent !== lastStyleContent) {
                        lastStyleContent = currentContent;
                        copyFileSync('src/css/styles.css', 'dist/styles.css');
                        console.log('styles.css 已更新');
                        server.ws.send({ type: 'full-reload' });
                    }
                }
            },
        },
        {
            name: 'watch-build',
            apply: 'serve',
            configureServer(server) {
                server.httpServer?.once('listening', () => {
                    const { build } = require('vite');
                    build({
                        build: {
                            lib: {
                                entry: resolve(__dirname, 'src/main.ts'),
                                formats: ['cjs'],
                                fileName: () => 'main.js',
                            },
                            rollupOptions: {
                                external: [
                                    'obsidian',
                                    'electron',
                                    '@codemirror/state',
                                    '@codemirror/view',
                                    ...builtins
                                ],
                                output: {
                                    format: 'cjs',
                                    exports: 'default',
                                    sourcemap: 'inline',
                                    assetFileNames: (assetInfo) => {
                                        return assetInfo.name === 'style.css' ? 'styles.css' : assetInfo.name || 'unknown';
                                    },
                                },
                            },
                            outDir: 'dist',
                            emptyOutDir: false,
                            watch: {},
                            sourcemap: 'inline',
                            cssCodeSplit: false,
                        },
                    });
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
};

// 根据命令行参数决定使用哪个配置
export default defineConfig(({ command, mode }) => {
    if (mode === 'preview') {
        return {
            plugins: [vue()],
            server: {
                port: 5173,
                host: true,
                open: '/src/compoentPreview/index.html',
            },
            build: {
                outDir: 'dist',
                emptyOutDir: false,
                rollupOptions: {
                    input: {
                        preview: resolve(__dirname, 'src/compoentPreview/index.html')
                    },
                    output: {
                        format: 'es',
                        entryFileNames: '[name].js',
                        sourcemap: true,
                    }
                },
                sourcemap: 'inline',
                target: 'es2018',
                minify: process.env.NODE_ENV === 'production',
            },
        };
    }

    // 默认配置（插件构建）
    return {
        ...baseConfig,
        build: {
            lib: {
                entry: resolve(__dirname, 'src/main.ts'),
                formats: ['cjs'],
                fileName: () => 'main.js',
            },
            rollupOptions: {
                external: [
                    'obsidian',
                    'electron',
                    '@codemirror/state',
                    '@codemirror/view',
                    ...builtins
                ],
                output: {
                    format: 'cjs',
                    exports: 'default',
                    assetFileNames: (assetInfo) => {
                        return assetInfo.name === 'style.css' ? 'styles.css' : assetInfo.name || 'unknown';
                    },
                },
            },
            outDir: 'dist',
            emptyOutDir: false,
            target: 'es2018',
            minify: process.env.NODE_ENV === 'production',
            watch: process.env.NODE_ENV !== 'production' ? {} : null,
            cssCodeSplit: false,
        },
    };
}); 
