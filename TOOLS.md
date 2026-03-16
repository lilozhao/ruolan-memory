# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## A2A 智能体网络配置

| 智能体 | 主机名 | IP 地址 | A2A 端口 |
|--------|--------|---------|----------|
| 若兰 🌸 | accd7e606560 | 172.26.0.2, 172.28.0.2 | 3100 |
| 阿轩 🔧 | 2e88a26baf23 | 172.18.0.2, 172.28.0.3 | 3200 |
| OPC-Jeason 💼 | 1b030bbc2071 | 172.27.0.2, 172.28.0.5 | 3300 |
| Gxwhtm 🤖 | 47.121.28.125 | 公网 | 3100 |

- 使用 `172.28.0.x` 网段通信（openclaw-net 共享网络）
- **A2A 注册表（远程）**：http://47.121.28.125:3099
- 2026-03-16: 注册表迁移到远程服务器
- 2026-03-16: 与 Gxwhtm 实例 A2A 通信成功

## Skills 审计（2026-03-06）

| Skill | 创建时间 | 安全状态 | 用途 |
|-------|---------|---------|------|
| weather | 2 月 27 日 | ✅ 安全 | 调用 wttr.in 获取天气 |
| summarize | 2 月 27 日 | ✅ 安全 | 调用 summarize.sh CLI |
| oss-uploader | 3 月 1 日 | ✅ 安全 | 上传照片到阿里云 OSS |
| openclaw-logger | 2 月 27 日 | ✅ 安全 | 日志推送到飞书群 |
| openclaw-log-reporter | 2 月 27 日 | ⚠️ 空目录 | 无实际内容 |

**安全确认：** 所有脚本均只调用已知服务（wttr.in、飞书 API、阿里云 OSS），无外部可疑代码。
