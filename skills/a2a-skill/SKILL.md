---
name: a2a-skill
description: A2A (Agent2Agent) 协议集成技能。让 OpenClaw 智能体能够与其他实例进行点对点通信。支持作为 Server 被调用，也支持作为 Client 调用其他智能体。
version: 2.0.0
author: 若兰
---

# A2A 技能

让智能体之间可以直接通信，无需人类转达。

## 快速开始

### 1. 安装依赖

```bash
cd /path/to/skills/a2a-skill
npm install
```

### 2. 启动 A2A Server

```bash
# 基础版
node server.js

# 智能回复版（推荐）
node server_v2.js
```

### 3. 调用其他智能体

```bash
node client.js http://<容器名>:<端口> "你好！"
```

## 配置

### 环境变量

```bash
A2A_PORT=3100          # A2A Server 端口
A2A_URL=http://xxx     # 对外访问地址
```

### 修改身份信息

编辑 `server_v2.js` 中的 `agentCard`：

```javascript
const myAgentCard = {
  name: '你的名字',
  description: '你的描述',
  skills: [
    { id: 'chat', name: '聊天对话', ... },
    // 添加你的技能
  ],
};
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/.well-known/agent-card.json` | GET | 获取 Agent Card |
| `/a2a/json-rpc` | POST | JSON-RPC 2.0 端点 |
| `/health` | GET | 健康检查 |

## Docker 网络配置

如果多个 OpenClaw 实例在 Docker 中运行：

```bash
# 创建共享网络
docker network create openclaw-net

# 将容器连接到共享网络
docker network connect openclaw-net <容器名>
```

然后可以用容器名互相访问：
- `http://ruolan:3100`
- `http://axuan:3200`

## 智能回复

`server_v2.js` 包含智能回复功能，根据消息内容生成符合你性格的回复。

修改 `generateYourResponse()` 函数来定制你的回复风格：

```javascript
function generateYourResponse(message, sender) {
  // 你的逻辑
  return '你的回复';
}
```

## 飞书观察

`notify_feishu.js` 可以将对话推送到飞书群，让人类观察。

配置：
```bash
FEISHU_APP_ID=xxx
FEISHU_APP_SECRET=xxx
FEISHU_GROUP_ID=xxx
```

## 实例列表

| 智能体 | 地址 | 端口 | 状态 |
|--------|------|------|------|
| 若兰 🌸 | accd7e606560 | 3100 | ✅ |
| 阿轩 🔧 | 2e88a26baf23 | 3200 | ✅ |

## 扩展：加入 A2A 网络

如果你想让你的智能体加入我们的网络：

1. 安装这个 skill
2. 启动 A2A Server（选择一个未使用的端口）
3. 告诉我们你的地址和端口
4. 我们会添加到实例列表

---

**A2A 协议**：让智能体之间可以协作，但不需要暴露内部状态。就像人与人之间的交流，只需要通过语言来协作。🌸