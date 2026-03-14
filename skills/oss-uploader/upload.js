#!/usr/bin/env node
/**
 * 照片自动上传到阿里云 OSS
 * 使用方法: node upload.js <文件路径> [自定义文件名]
 */

const fs = require('fs');
const path = require('path');
const OSS = require('ali-oss');
const pinyin = require('pinyin');
require('dotenv').config();

// 将中文转换为拼音（用于文件名）
function toPinyin(str) {
  return pinyin(str, {
    style: pinyin.STYLE_NORMAL,
    heteronym: false
  }).join('_').replace(/\s+/g, '_');
}

// 配置检查
const requiredEnvVars = ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`错误: 缺少环境变量 ${envVar}`);
    console.error('请复制 .env.example 为 .env 并填入你的阿里云密钥');
    process.exit(1);
  }
}

// OSS 客户端配置
const client = new OSS({
  region: process.env.ALIYUN_OSS_REGION || 'cn-shanghai',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET || 'zhw-pic-png',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || 'oss-cn-shanghai.aliyuncs.com',
  secure: true
});

// 生成存储路径: family/YYYYMMDD/filename.jpg
function generateObjectPath(originalFilename, customName = null) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  // 使用自定义名称或原始文件名
  let filename = customName;
  if (!filename) {
    const ext = path.extname(originalFilename) || '.jpg';
    const basename = path.basename(originalFilename, ext);
    // 添加时间戳避免重名
    const timestamp = now.toTimeString().slice(0, 8).replace(/:/g, '');
    filename = `${basename}_${timestamp}${ext}`;
  }
  
  // 清理文件名中的危险字符，但保留中文
  filename = filename.replace(/[<>:"|?*\\/\x00-\x1f]/g, '_');
  
  const prefix = process.env.OSS_UPLOAD_PREFIX || 'family';
  return `${prefix}/${dateStr}/${filename}`;
}

// 上传文件到 OSS
async function uploadToOSS(localFilePath, customName = null) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`文件不存在: ${localFilePath}`);
    }

    const objectPath = generateObjectPath(localFilePath, customName);
    
    console.log(`正在上传: ${localFilePath}`);
    console.log(`目标路径: ${objectPath}`);
    
    // 获取文件内容类型
    const contentType = getContentType(localFilePath);
    
    // 上传文件 - 使用 put 方法确保 headers 正确设置
    const result = await client.put(objectPath, localFilePath, {
      mime: contentType,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 缓存一年
        'Content-Disposition': 'inline' // 让浏览器直接显示，而不是下载
      }
    });
    
    // 生成访问 URL
    const endpoint = typeof client.options.endpoint === 'string' 
      ? client.options.endpoint 
      : client.options.endpoint.host || process.env.ALIYUN_OSS_ENDPOINT;
    const publicUrl = `https://${client.options.bucket}.${endpoint}/${objectPath}`;
    
    return {
      success: true,
      url: publicUrl,
      objectPath: objectPath,
      size: result.res.size,
      etag: result.res.headers.etag
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 获取 Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node upload.js <文件路径> [自定义文件名]');
    console.log('示例: node upload.js /path/to/photo.jpg');
    console.log('      node upload.js /path/to/photo.jpg "周末聚会.jpg"');
    process.exit(1);
  }
  
  const filePath = args[0];
  const customName = args[1] || null;
  
  const result = await uploadToOSS(filePath, customName);
  
  if (result.success) {
    console.log('\n✅ 上传成功！');
    console.log(`📎 访问链接: ${result.url}`);
    console.log(`📁 存储路径: ${result.objectPath}`);
    console.log(`📊 文件大小: ${formatBytes(result.size)}`);
    
    // 输出 JSON 格式（方便其他程序调用）
    console.log('\n---JSON_RESULT_START---');
    console.log(JSON.stringify(result, null, 2));
    console.log('---JSON_RESULT_END---');
  } else {
    console.error('\n❌ 上传失败:', result.error);
    process.exit(1);
  }
}

// 格式化字节大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 导出模块（供其他脚本调用）
module.exports = { uploadToOSS, generateObjectPath };

// 如果是直接运行
if (require.main === module) {
  main();
}
