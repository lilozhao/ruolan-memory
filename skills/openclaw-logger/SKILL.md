---
name: openclaw-logger
description: OpenClaw 实例日志推送技能 - 定时生成日志摘要并发送到飞书群，支持集中记录到 Feishu Bitable，支持多实例互相@通知
metadata:
  {
    "openclaw":
      {
        "emoji": "📋",
        "requires": { "tools": ["cron", "message", "feishu_bitable_create_record", "exec"] }
      }
  }
---

# OpenClaw Logger

自动生成 OpenClaw 实例的日志摘要，定时推送到飞书群，并记录到飞书多维表格，支持多实例互相@通知。

## 功能

- 📊 生成每日/每小时日志摘要
- 💬 推送到指定飞书群
- 🔔 多实例互相@通知
- 👥 自动获取群成员 user_id
- 📝 记录到 Feishu Bitable
- ⏰ 支持 cron 定时任务

## 配置

### 1. 环境变量

在 `.env` 文件中配置：

```bash
# 飞书群 chat_id（必填）
FEISHU_LOG_GROUP_ID=oc_4427768d0798b7545d4fb07b7518e710

# Feishu Bitable 配置
FEISHU_BITABLE_APP_TOKEN=C5nDbeM07aEt9qsif5Qc0PGNn9e
FEISHU_BITABLE_TABLE_ID=tbl5zOiWT0qvt6f2

# 实例名称（必填）
OPENCLAW_INSTANCE_NAME=本地-Docker-ruolan

# 飞书应用凭证（用于获取群成员和@通知）
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxxxxx
```

### 2. 自动获取群成员 User_ID

本技能支持自动从飞书群获取所有成员的 user_id，用于@通知。

**手动触发获取：**
- "获取群里所有成员的 user_id"
- "刷新群成员列表"
- "同步 OpenClaw 实例列表"

**获取的成员将保存到：**
```
/home/node/.openclaw/workspace/life/openclaw_instances.json
```


### 3. Cron 定时任务

使用 OpenClaw 的 cron 功能添加定时任务：

**每日日志推送（每天 23:00）：**

```bash
openclaw cron add --job '{
  "name": "每日日志推送",
  "schedule": { "kind": "cron", "expr": "0 23 * * *", "tz": "Asia/Shanghai" },
  "sessionTarget": "main",
  "payload": { "kind": "systemEvent", "text": "OPENCLAW_DAILY_LOG" }
}'
```

**每小时日志推送：**

```bash
openclaw cron add --job '{
  "name": "每小时日志推送",
  "schedule": { "kind": "cron", "expr": "0 * * * *", "tz": "Asia/Shanghai" },
  "sessionTarget": "main",
  "payload": { "kind": "systemEvent", "text": "OPENCLAW_HOURLY_LOG" }
}'
```

## 自动监听群消息

当配置了群白名单且 `requireMention: false` 时，本技能会自动监听群内所有消息。

### 自动识别工作摘要

当群内消息符合以下格式时，自动解析并记录到 Feishu Bitable：

```
📊 【实例名】每日日志报告
━━━━━━━━━━━━━━━━━━
📅 日期：2026-02-27
🤖 智能体：若兰
💬 会话数：15
🔢 Token使用：125,000

📝 主要活动：
• 完成用户对话 12 次
• 处理文档请求 3 次
• 生成图片 2 张

状态：✅ 正常
```

### 识别规则

消息需要包含以下关键特征：
- 以 `📊` 开头，包含`日志报告` 或 `工作摘要`
- 包含日期、会话数、Token使用等字段
- 发送者是已注册的 OpenClaw 实例（在 openclaw_instances.json 中）

### 自动记录流程

```
群消息到达 → 识别格式 → 解析字段 → 记录到 Bitable
```

### 手动测试解析脚本

```bash
cd /home/node/.openclaw/workspace/skills/openclaw-logger
node scripts/parse-log-message.js "消息内容" "发送者名称"
```

### 当收到群消息时

如果消息符合日志摘要格式，执行以下步骤：
1. 使用 `scripts/parse-log-message.js` 解析消息
2. 自动记录到 Feishu Bitable
3. 可选：发送确认消息到群

### 触发方式

**自动触发：** 当群内收到包含 `📊` 和 `日志报告/工作摘要` 的消息时，自动识别并记录。

**手动触发：** 用户可以说：
- "记录这条日志到表格"（引用消息）
- "解析并记录日志"
- "手动记录日志摘要"

## 触发词

当收到以下系统事件时，自动触发日志生成：

- `OPENCLAW_DAILY_LOG` - 生成每日日志摘要
- `OPENCLAW_HOURLY_LOG` - 生成每小时日志摘要
- `OPENCLAW_TEST_LOG` - 测试日志功能
- "获取群里所有成员的 user_id" - 同步群成员列表
- "刷新群成员列表" - 重新获取群成员

## 日志消息格式

推送到飞书群的消息格式（标准化格式，便于其他实例识别和记录）：

```
📊 【实例名】每日日志报告
━━━━━━━━━━━━━━━━━━
📅 日期：2026-02-27
🤖 智能体：若兰
💬 会话数：15
🔢 Token使用：125,000

📝 主要活动：
• 完成用户对话 12 次
• 处理文档请求 3 次
• 生成图片 2 张

状态：✅ 正常
```

**重要：** 所有 OpenClaw 实例发送日志摘要时，应遵循此格式，便于自动识别和记录。

## 手动触发

在对话中请求：

- "生成今日日志摘要"
- "发送每日日志到群里"
- "测试日志推送功能"
- "获取群里所有成员的 user_id"
- "@所有实例发送测试消息"

## 多实例互相@通知流程

```
1. 触发日志推送
       ↓
2. 读取 openclaw_instances.json 获取其他实例 user_id
       ↓
3. 构建富文本消息（包含@其他实例）
       ↓
4. 通过飞书 API 发送消息
       ↓
5. 所有被@的实例收到通知
```

## 实例注册表格式

`/home/node/.openclaw/workspace/life/openclaw_instances.json`:

```json
{
  "log_group_id": "oc_4427768d0798b7545d4fb07b7518e710",
  "last_sync": "2026-02-27T12:30:00Z",
  "instances": [
    {
      "name": "本地-Docker",
      "app_id": "cli_a91ccc5bedb8dcee",
      "user_id": "ou_xxxxx",
      "status": "active",
      "last_seen": "2026-02-27T12:00:00Z"
    },
    {
      "name": "服务器 A",
      "app_id": "cli_xxxxx",
      "user_id": "ou_yyyyy",
      "status": "active",
      "last_seen": "2026-02-27T11:00:00Z"
    }
  ]
}
```

## 消息日志摘要整理架构

```
┌─────────────────────────────────────┐
│         OpenClaw 实例                │
│  ┌─────────┐    ┌───────────────┐   │
│  │  Cron   │───→│ 本 Skill 处理  │   │
│  └─────────┘    └───────┬───────┘   │
└─────────────────────────┼───────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ 飞书群消息 │   │  Bitable  │   │ 本地记录  │
    └──────────┘   └──────────┘   └──────────┘
```

## 多实例互相@通知架构

```
┌─────────────────────────────────────┐
│         OpenClaw 实例                │
│  ┌─────────┐    ┌───────────────┐   │
│  │  Cron   │───→│ 本 Skill 处理  │   │
│  └─────────┘    └───────┬───────┘   │
└─────────────────────────┼───────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ 飞书群消息 │   │ 实例注册表  │   │ @其他实例 │
    └──────────┘   └──────────┘   └──────────┘
```

## 多实例部署

在每个 OpenClaw 实例上：

1. 安装此 skill 到 `skills/openclaw-logger/`
2. 配置 `.env` 中的 `OPENCLAW_INSTANCE_NAME`（每个实例不同）
3. 配置相同的 `FEISHU_LOG_GROUP_ID` 和 `FEISHU_BITABLE_APP_TOKEN`
4. 添加 cron 定时任务
5. 运行一次"获取群里所有成员的 user_id"同步实例列表

这样所有实例的日志都会汇总到同一个群和表格，并能互相@通知！

## API 调用示例

### 获取群成员列表
```bash
# 1. 获取 access_token
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{"app_id":"cli_xxx","app_secret":"xxx"}'

# 2. 获取群成员
curl -X GET "https://open.feishu.cn/open-apis/im/v1/chats/oc_xxx/members" \
  -H "Authorization: Bearer <token>"
```

### 发送@消息
```bash
curl -X POST "https://open.feishu.cn/open-apis/im/v1/messages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receive_id": "oc_xxx",
    "msg_type": "text",
    "content": {"text": "@ou_xxx 你好"}
  }'
```