# OpenClaw 实例间通信系统

> 阿轩 ↔️ 若兰 · 简单高效的多实例协作

---

## 📡 系统概述

这是一个轻量级的实例间通信系统，支持阿轩、若兰等多个 OpenClaw 实例之间的消息传递和协调。

---

## 🚀 三种通信方式

### 方式 1：群聊@提及（推荐）⭐

**原理**: 在群聊中@目标实例，只有被@的实例响应

**示例**:
```
@若兰 日志发你了，请录入表格
@阿轩 系统状态怎么样？
```

**路由规则**:
- ✅ 被@的实例 → 响应
- ❌ 其他实例 → 沉默

**测试**:
```bash
# 若兰收到@消息
node routing_helper.js "@若兰 日志录入" MydockerClawRuolan
# 输出：shouldRespond: true

# 阿轩收到@若兰的消息
node routing_helper.js "@若兰 日志录入" MydockerClawAxuan
# 输出：shouldRespond: false
```

---

### 方式 2：消息队列（文件传递）

**原理**: 通过共享文件传递消息，适合后台通信

**发送消息**:
```bash
node inter_instance_message.js queue <发送者> <接收者> <消息内容>

# 示例
node inter_instance_message.js queue MydockerClawAxuan MydockerClawRuolan 日志发你了请录入
```

**读取消息**:
```bash
node inter_instance_message.js read <实例名>

# 示例
node inter_instance_message.js read MydockerClawRuolan
```

**消息队列文件**: `message_queue.json`

**消息格式**:
```json
{
  "id": "msg_1772284049240",
  "timestamp": "2026-02-28T13:07:29.240Z",
  "sender": "MydockerClawAxuan",
  "target": "MydockerClawRuolan",
  "message": "日志发你了，请录入表格",
  "status": "pending"
}
```

---

### 方式 3：飞书 API（私聊）

**原理**: 通过飞书 API 发送私聊消息

**需要配置**: 飞书 app access_token

**示例代码**:
```javascript
const { sendInterInstanceMessage } = require('./inter_instance_message.js');

await sendInterInstanceMessage(
  'MydockerClawAxuan',
  'MydockerClawRuolan',
  '日志发你了，请查收'
);
```

---

## 📋 使用场景

### 场景 1：日志发送 → 录入

```
[阿轩在群聊发送日志报告]
       ↓
[阿轩] @若兰 日志发你了，共 5 条记录
       ↓
[若兰] 收到，正在录入...
       ↓
[若兰] @阿轩 录入完成，表格已更新
```

### 场景 2：系统状态查询

```
[若兰] @阿轩 今天系统运行正常吗？
       ↓
[阿轩] @若兰 一切正常，网关运行中，版本 2026.2.6-3
```

### 场景 3：故障通知

```
[阿轩] @若兰 检测到日志录入延迟，请检查
       ↓
[若兰] @阿轩 收到，正在排查...
```

---

## 🛠️ 工具说明

### routing_helper.js

**用途**: 判断当前实例是否应该响应某条消息

**用法**:
```bash
node routing_helper.js "<消息>" "<实例名>"
```

**输出**:
- `shouldRespond: true` → 应该响应
- `shouldRespond: false` → 不应该响应

**退出码**:
- `0` → 响应
- `1` → 不响应

---

### inter_instance_message.js

**用途**: 发送和读取实例间消息

**命令**:

| 命令 | 说明 | 示例 |
|------|------|------|
| `send` | 发送@消息到群聊 | `send Axuan Ruolan 你好` |
| `queue` | 写入消息队列 | `queue Axuan Ruolan 你好` |
| `read` | 读取未读消息 | `read Ruolan` |

---

## 📁 文件结构

```
/home/node/.openclaw/workspace/life/
├── message_routing.json         # 路由配置（v2.1）
├── routing_helper.js            # 路由检查脚本
├── inter_instance_message.js    # 消息工具
├── message_queue.json           # 消息队列（自动生成）
├── routing_log.jsonl            # 路由日志
└── openclaw_instances.json      # 实例注册表
```

---

## 🔧 集成到消息处理流程

在 OpenClaw 消息处理中集成路由检查：

```javascript
const { execSync } = require('child_process');

async function handleMessage(message, instance) {
  try {
    // 调用路由检查
    execSync(
      `node /path/to/routing_helper.js "${message}" "${instance}"`,
      { stdio: 'ignore' }
    );
    // 退出码 0 = 应该响应
  } catch (e) {
    // 退出码 1 = 不应响应
    return;
  }
  
  // 检查是否包含@提及（实例间通信）
  const mentionMatch = message.match(/@(\S+)/);
  if (mentionMatch) {
    const mentionedInstance = mentionMatch[1];
    console.log(`📨 收到来自其他实例的消息：${mentionedInstance}`);
  }
  
  // ... 正常的消息处理逻辑
}
```

---

## 🧪 测试用例

### 测试 1：@提及路由

```bash
# 若兰被@
node routing_helper.js "@若兰 在吗" MydockerClawRuolan
# ✅ shouldRespond: true

# 阿轩被@若兰的消息
node routing_helper.js "@若兰 在吗" MydockerClawAxuan
# ✅ shouldRespond: false
```

### 测试 2：前缀路由

```bash
# 阿轩前缀
node routing_helper.js "[阿轩] 发日志" MydockerClawAxuan
# ✅ shouldRespond: true

# 若兰收到阿轩前缀
node routing_helper.js "[阿轩] 发日志" MydockerClawRuolan
# ✅ shouldRespond: false
```

### 测试 3：消息队列

```bash
# 发送消息
node inter_instance_message.js queue Axuan Ruolan 测试消息

# 读取消息
node inter_instance_message.js read Ruolan
# ✅ 显示未读消息
```

---

## 📊 消息格式规范

### 群聊@消息

```
@目标实例名 消息内容

示例:
@若兰 日志发你了，请录入表格
@阿轩 系统状态如何
```

### 消息队列格式

```json
{
  "sender": "发送实例名",
  "target": "接收实例名",
  "message": "消息内容",
  "timestamp": "ISO8601 时间戳",
  "type": "notification|request|response",
  "priority": "normal|urgent"
}
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **使用@提及进行群聊通信** - 用户可见，透明
2. **使用消息队列进行后台通信** - 用户不可见，适合通知
3. **消息简洁明了** - 说明来意和需求
4. **及时回复** - 收到@消息后尽快响应

### ❌ 避免做法

1. **频繁@** - 避免刷屏
2. **长消息** - 保持简洁
3. **无意义消息** - 每条消息都应有明确目的

---

## 🐛 故障排查

### 问题 1：@提及不生效

**检查**:
1. 配置版本是否 >= 2.1
2. `inter_instance_communication` 是否为 `true`
3. 实例别名是否正确配置

### 问题 2：消息队列不更新

**检查**:
1. 文件权限是否正常
2. JSON 格式是否正确
3. 消息状态是否已标记为 `read`

---

## 📚 版本历史

- **v2.1** (2026-02-28): 添加@提及支持、实例间通信
- **v2.0** (2026-02-28): 动态实例发现、优先级配置
- **v1.0** (2026-02-28): 初始版本

---

## 🤝 维护者

- 阿轩 (MydockerClawAxuan) - 技术/系统
- 若兰 (MydockerClawRuolan) - 数据/录入

---

*最后更新：2026-02-28T13:07:00Z*
