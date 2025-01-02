import fs from 'fs';
import { watch } from 'fs/promises';
import path from 'path';

const SOURCE_CSS = 'src/css/styles.css';
const DEST_CSS = 'dist/styles.css';

async function syncStyles() {
    try {
        // 确保目标目录存在
        const destDir = path.dirname(DEST_CSS);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // 复制文件
        fs.copyFileSync(SOURCE_CSS, DEST_CSS);
        console.log('样式文件已同步到:', DEST_CSS);
    } catch (error) {
        console.error('同步样式文件失败:', error);
    }
}

async function watchStyles() {
    try {
        // 确保源文件存在
        if (!fs.existsSync(SOURCE_CSS)) {
            console.error('源样式文件不存在:', SOURCE_CSS);
            return;
        }

        console.log('开始监听样式文件变化:', SOURCE_CSS);
        
        // 执行初始同步
        await syncStyles();

        // 开始监听文件变化
        const watcher = watch(path.dirname(SOURCE_CSS));
        
        for await (const event of watcher) {
            if (event.filename === path.basename(SOURCE_CSS)) {
                console.log('检测到样式文件变化');
                await syncStyles();
            }
        }
    } catch (error) {
        console.error('监听样式文件失败:', error);
    }
}

// 启动监听
watchStyles(); 
