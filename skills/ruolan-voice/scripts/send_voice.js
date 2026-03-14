#!/usr/bin/env node
/**
 * 若兰语音发送脚本
 * 使用 Edge TTS 生成语音，通过 OpenClaw message 工具发送
 */

const { EdgeTTS } = require('/usr/local/lib/node_modules/openclaw/node_modules/node-edge-tts/dist/edge-tts.js');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

// 加载配置
function loadConfig() {
  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configContent);
  } catch (e) {
    console.error('加载配置文件失败:', e.message);
    // 返回默认配置
    return {
      tts: {
        provider: 'edge',
        voice: 'zh-CN-XiaoxiaoNeural',
        lang: 'zh-CN',
        outputFormat: 'mp3'
      },
      output: {
        directory: '/home/node/.openclaw/workspace/tmp',
        filePrefix: 'ruolan_voice_',
        fileExtension: '.mp3'
      }
    };
  }
}

async function generateVoice(text, outputPath, config) {
  const tts = new EdgeTTS({ 
    voice: config.tts.voice, 
    lang: config.tts.lang 
  });
  await tts.ttsPromise(text, outputPath);
}

async function main() {
  const text = process.argv[2];
  if (!text) {
    console.log('用法: node send_voice.js "<消息内容>"');
    console.log('');
    console.log('配置文件: config.json');
    process.exit(1);
  }
  
  // 加载配置
  const config = loadConfig();
  
  // 确保输出目录存在
  const outputDir = config.output.directory;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    const ts = Date.now();
    const fileName = `${config.output.filePrefix}${ts}${config.output.fileExtension}`;
    const outputPath = path.join(outputDir, fileName);
    
    console.log(`使用语音: ${config.tts.voiceName || config.tts.voice} (${config.tts.voice})`);
    console.log('生成语音...');
    await generateVoice(text, outputPath, config);
    
    const stats = fs.statSync(outputPath);
    console.log(`已生成: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    
    // 输出文件路径供 message 工具使用
    console.log(`MEDIA:${outputPath}`);
  } catch (e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
}

main();