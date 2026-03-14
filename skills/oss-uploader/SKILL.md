---
name: oss-uploader
description: 自动将照片上传到阿里云 OSS 存储，生成可访问的公共链接。支持自定义文件名、路径组织和批量上传。
---

# OSS 照片上传工具

将本地照片文件上传到阿里云 OSS（对象存储服务），生成可直接访问的 HTTPS 链接。

## 功能特性

- ✅ 自动生成规范的文件路径（`family/YYYYMMDD/filename.jpg`）
- ✅ 支持自定义文件名
- ✅ 返回可直接访问的公共 URL
- ✅ 支持中文文件名（自动处理）
- ✅ 配置简单（环境变量或配置文件）

## 使用前提

需要配置阿里云 OSS 凭证：

```bash
# 方式1：环境变量
export ALIYUN_ACCESS_KEY_ID=你的AccessKeyID
export ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
export ALIYUN_OSS_BUCKET=你的Bucket名称
export ALIYUN_OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
export ALIYUN_OSS_REGION=cn-shanghai

# 方式2：.env 文件（推荐）
# 在 oss-uploader 目录下创建 .env 文件
```

## 使用方法

### 单文件上传

```javascript
const { uploadToOSS } = require('/home/admin/openclaw/workspace/oss-uploader/upload');

const result = await uploadToOSS('/path/to/photo.jpg', '自定义文件名.jpg');
console.log(result.url);  // https://bucket.oss-cn-shanghai.aliyuncs.com/family/20250225/xxx.jpg
```

### 批量上传

```javascript
const { uploadToOSS } = require('/home/admin/openclaw/workspace/oss-uploader/upload');

const files = [
  { path: '/path/to/photo1.jpg', name: '照片1.jpg' },
  { path: '/path/to/photo2.jpg', name: '照片2.jpg' }
];

for (const file of files) {
  const result = await uploadToOSS(file.path, file.name);
  console.log(`${file.name}: ${result.url}`);
}
```

### 命令行使用

```bash
cd /home/admin/openclaw/workspace/oss-uploader
node upload.js /path/to/photo.jpg "自定义文件名.jpg"
```

## 返回结果格式

```json
{
  "success": true,
  "url": "https://zhw-pic-png.oss-cn-shanghai.aliyuncs.com/family/20260225/杭娟_黄山桃花_田野1_20250225.jpg",
  "objectPath": "family/20260225/杭娟_黄山桃花_田野1_20250225.jpg",
  "size": 1234567,
  "etag": "\"ABC123...\""
}
```

## 命名规范建议

为了便于后续查找和管理，建议使用以下文件名格式：

```
人物_地点_描述_日期.扩展名
```

示例：
- `杭娟_黄山_桃花_20250225.jpg`
- `喆恺_学校_足球赛_20220615.jpg`
- `全家福_海南_天涯海角_201808.jpg`

## 实际使用场景

### 场景1：上传家庭照片并记录档案

```javascript
// 1. 接收用户上传的照片
// 2. 询问照片信息（人物、时间、地点、事件）
// 3. 上传到 OSS
const result = await uploadToOSS(
  '/tmp/inbound/photo.jpg',
  '杭娟_黄山_古建筑_20250225.jpg'
);

// 4. 将信息记录到照片档案
// 5. 返回 OSS 链接给用户
```

### 场景2：批量上传旅行照片

```javascript
const photos = [
  { file: '/tmp/photo1.jpg', desc: '黄山日出' },
  { file: '/tmp/photo2.jpg', desc: '云海奇观' },
  { file: '/tmp/photo3.jpg', desc: '迎客松' }
];

const results = [];
for (const photo of photos) {
  const result = await uploadToOSS(
    photo.file,
    `杭娟_黄山_${photo.desc}_20250225.jpg`
  );
  results.push({ desc: photo.desc, url: result.url });
}
```

## 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 上传失败 | AccessKey 无效 | 检查 .env 文件中的密钥 |
| 无法访问链接 | Bucket 权限设置 | 确认 Bucket 为公共读权限 |
| 文件名乱码 | 编码问题 | 确保使用 UTF-8 编码 |
| 速率限制 | 频繁调用 | 增加重试逻辑或降低频率 |

## 相关文件

- 上传脚本：`/home/admin/openclaw/workspace/oss-uploader/upload.js`
- 配置文件：`/home/admin/openclaw/workspace/oss-uploader/.env`
- 依赖目录：`/home/admin/openclaw/workspace/oss-uploader/node_modules/`
