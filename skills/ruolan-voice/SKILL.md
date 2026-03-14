---
name: ruolan-voice
description: 若兰语音消息技能。生成语音并发送到飞书私聊窗口。当用户请求语音消息、想听若兰的声音、或需要发送语音到飞书时触发。
---

# 若兰语音技能

生成中文语音消息并发送到飞书私聊。

## 配置文件

所有配置在 `config.json` 中管理：

```json
{
  "tts": {
    "provider": "edge",
    "voice": "zh-CN-XiaoxiaoNeural",
    "voiceName": "晓晓",
    "lang": "zh-CN"
  },
  "output": {
    "directory": "/home/node/.openclaw/workspace/tmp",
    "filePrefix": "ruolan_voice_",
    "fileExtension": ".mp3"
  }
}
```

## 可用语音选项

| 语音ID | 名称 | 描述 |
|--------|------|------|
| zh-CN-XiaoxiaoNeural | 晓晓 | 温婉女声（当前使用） |
| zh-CN-XiaoyiNeural | 晓艺 | 温柔女声 |
| zh-CN-YunxiNeural | 云希 | 年轻男声 |
| zh-CN-YunjianNeural | 云健 | 成熟男声 |

## 使用方法

```bash
node /home/node/.openclaw/workspace/skills/ruolan-voice/scripts/send_voice.js "<消息内容>"
```

输出: `MEDIA:/path/to/file.mp3`

然后用 message 工具发送：
```
message action=send channel=feishu filePath="<输出的路径>" to="<open_id>"
```

## ⚠️ 重要提醒

- **只发送一次**：必须使用脚本输出的完全相同的文件路径
- **不要猜测时间戳**：文件名中的时间戳是生成时的精确时间

## 技术细节

- **TTS引擎**: Edge TTS (Microsoft) - 免费，无需 API Key
- **当前语音**: 晓晓 (zh-CN-XiaoxiaoNeural)
- **输出格式**: MP3
- **配置文件**: config.json