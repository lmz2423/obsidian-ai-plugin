import { defineConfig,PluginOption } from 'vite';
import { resolve } from 'path';
import builtins from 'builtin-modules';
import { existsSync, copyFileSync, mkdirSync, readFileSync, watch } from 'fs';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

const ElementPlugin:Array<PluginOption> = [
	AutoImport({
		resolvers: [ElementPlusResolver()],
	}),
	Components({
		resolvers: [ElementPlusResolver()],
	}),
]

// 确保 dist 目录存在
if (!existsSync('dist')) {
    mkdirSync('dist');
}

// 复制文件到 dist 的函数
function copyToDist(filename: string, source?: string) {
    const sourcePath = source ? source : filename;
    if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, `dist/${filename}`);
        console.log(`已复制 ${filename} 到 dist 目录`);
    }
}

// 初始化复制必要文件
copyToDist('manifest.json');

// 用于缓存文件内容的变量
let lastManifestContent = existsSync('manifest.json') ? readFileSync('manifest.json', 'utf-8') : '';

// 创建基础构建配置
const baseConfig = {
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    // isCustomElement: (tag) => tag.includes('-')
                }
            },
            script: {
                defineModel: true,
                propsDestructure: true
            }
        }),
        {
            name: 'watch-external',
            async buildStart() {
                if (process.env.NODE_ENV !== 'production') {
                    this.addWatchFile('manifest.json');
                }
            },
            handleHotUpdate({ file, server }) {
                if (file.endsWith('manifest.json')) {
                    const currentContent = readFileSync(file, 'utf-8');
                    if (currentContent !== lastManifestContent) {
                        lastManifestContent = currentContent;
                        copyToDist('manifest.json');
                    }
                }
            },
        },
        {
            name: 'watch-build',
            apply: 'serve' as const,
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
                                    assetFileNames: (assetInfo) => {
                                        if (assetInfo.name === 'style.css') {
                                            return 'styles.css';
                                        }
                                        return assetInfo.name || 'unknown';
                                    },
                                },
                            },
                            outDir: 'dist',
                            emptyOutDir: false,
                            watch: {},
                            sourcemap: true,
                            cssCodeSplit: false,
                        },
                    });
                });
            },
        },
		...ElementPlugin,
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
        dedupe: ['vue'],
    },
    optimizeDeps: {
        exclude: ['obsidian']
    },
    css: {
        postcss: {},
    },
};

// 根据命令行参数决定使用哪个配置
export default defineConfig(({ command, mode }) => {
    if (mode === 'preview') {
        return {
            plugins: [vue(),...ElementPlugin],
            server: {
                port: 5173,
                host: true,
                open: '/src/componentPreview/index.html',
            },
            build: {
                outDir: 'dist',
                emptyOutDir: false,
                rollupOptions: {
                    input: {
                        preview: resolve(__dirname, 'src/componentPreview/index.html')
                    },
                    external: ['obsidian'],
                    output: {
                        format: 'es',
                        entryFileNames: '[name].js',
                        sourcemap: true,
                    }
                },
                sourcemap: true,
                target: 'es2018',
                minify: process.env.NODE_ENV === 'production',
            },
        };
    } 

    // 默认配置（插件构建）
    return {
        ...baseConfig,
        build: {
			sourcemap: false,
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
                        if (assetInfo.name === 'style.css') {
                            return 'styles.css';
                        }
                        return assetInfo.name || 'unknown';
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
