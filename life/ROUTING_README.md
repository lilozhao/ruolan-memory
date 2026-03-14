# OpenClaw 消息路由系统 v2.0

> 动态实例发现 · 智能关键词路由 · 多实例协调

---

## 📋 系统概述

这是一个可扩展的多实例消息路由系统，用于协调多个 OpenClaw 实例（阿轩、若兰等）在群聊中的响应行为，避免抢答和冲突。

---

## 🚀 快速开始

### 基本用法

```bash
# 检查当前实例是否应该响应某条消息
node routing_helper.js "<消息内容>" "<实例名称>"

# 示例
node routing_helper.js "[阿轩] 发个日志" MydockerClawAxuan
node routing_helper.js "表格录入好了吗" MydockerClawRuolan
```

### 退出码

- `0` → 应该响应
- `1` → 不应该响应

### 输出格式

```json
{
  "instance": "MydockerClawAxuan",
  "message": "[阿轩] 发个日志",
  "config_version": "2.0",
  "shouldRespond": true,
  "reason": "前缀匹配：\"[阿轩]\"",
  "matchType": "prefix",
  "matchDetail": "[阿轩]"
}
```

---

## 📁 文件结构

```
/home/node/.openclaw/workspace/life/
├── message_routing.json      # 路由配置文件
├── routing_helper.js         # 路由检查脚本
├── openclaw_instances.json   # 实例注册表（自动发现）
└── routing_log.jsonl         # 路由日志（可选）
```

---

## ⚙️ 配置说明

### message_routing.json

#### 1. 全局设置

```json
{
  "global_settings": {
    "dm_always_respond": true,        // 私聊始终响应
    "group_require_prefix": true,     // 群聊需要前缀
    "default_behavior": "no_response", // 默认行为
    "auto_discovery": true,           // 启用自动发现
    "instances_file": "..."           // 实例注册表路径
  }
}
```

#### 2. 优先级顺序

```json
{
  "priority_order": [
    "MydockerClawAxuan",    // 优先级 1（最高）
    "MydockerClawRuolan",   // 优先级 2
    "MydockerClawRuolan-2", // 优先级 3
    ...
  ]
}
```

#### 3. 实例配置

```json
{
  "instance_profiles": {
    "MydockerClawAxuan": {
      "name": "阿轩",
      "alias": ["axuan", "阿轩"],
      "role": "技术/系统",
      "prefixes": ["[阿轩]", "[技术]", "/axuan"],
      "keywords": ["配置", "调试", "系统", ...],
      "image_keywords": ["照片", "自拍", ...],
      "enabled": true
    }
  }
}
```

---

## 🎯 路由规则

### 匹配优先级

1. **前缀匹配** (优先级 1) - 如 `[阿轩] xxx`
2. **别名匹配** (优先级 1) - 如 `阿轩在吗`
3. **关键词匹配** (优先级 2) - 如 `系统配置`
4. **无匹配** - 不响应

### 冲突解决

当多个实例同时匹配时：
- 按 `priority_order` 决定谁响应
- 优先级高的实例响应，其他实例沉默

---

## 📝 使用示例

### 场景 1：前缀路由

| 消息 | 阿轩 | 若兰 |
|------|------|------|
| `[阿轩] 发个日志` | ✅ | ❌ |
| `[若兰] 表格录入` | ❌ | ✅ |
| `【阿轩】系统状态` | ✅ | ❌ |

### 场景 2：关键词路由

| 消息 | 阿轩 | 若兰 |
|------|------|------|
| `系统配置怎么改` | ✅ (关键词) | ❌ |
| `多维表数据整理` | ❌ | ✅ (关键词) |
| `网关重启了吗` | ✅ (关键词) | ❌ |

### 场景 3：别名路由

| 消息 | 阿轩 | 若兰 |
|------|------|------|
| `阿轩在吗` | ✅ | ❌ |
| `若兰你好` | ❌ | ✅ |

### 场景 4：无匹配

| 消息 | 阿轩 | 若兰 |
|------|------|------|
| `今天天气不错` | ❌ | ❌ |
| `早上好` | ❌ | ❌ |

---

## 🔧 添加新实例

### 步骤 1：在 openclaw_instances.json 注册

```json
{
  "instances": [
    {
      "name": "MydockerClawNewBot",
      "app_id": "cli_xxxxxxxxxxxxx",
      "user_id": "ou_xxxxxxxxxxxxx",
      "status": "active",
      "location": "xxx",
      "notes": "新机器人"
    }
  ]
}
```

### 步骤 2：在 message_routing.json 添加配置

```json
{
  "instance_profiles": {
    "MydockerClawNewBot": {
      "name": "新机器人",
      "alias": ["newbot", "新机器人"],
      "role": "xxx",
      "prefixes": ["[新机器人]", "/newbot"],
      "keywords": ["关键词 1", "关键词 2"],
      "enabled": true
    }
  },
  "priority_order": [
    "MydockerClawAxuan",
    "MydockerClawRuolan",
    "MydockerClawNewBot"
  ]
}
```

### 步骤 3：部署到新实例

复制文件到新实例的工作空间：
```bash
cp message_routing.json /path/to/newbot/workspace/life/
cp routing_helper.js /path/to/newbot/workspace/life/
```

### 步骤 4：测试

```bash
node routing_helper.js "[新机器人] 测试" MydockerClawNewBot
```

---

## 📊 日志系统

路由日志记录在 `routing_log.jsonl`，每行一个 JSON 对象：

```json
{
  "timestamp": "2026-02-28T12:45:00.000Z",
  "message": "[阿轩] 发个日志",
  "instance": "MydockerClawAxuan",
  "decision": "respond",
  "match_type": "prefix",
  "reason": "前缀匹配：\"[阿轩]\""
}
```

---

## 🎛️ 集成到 OpenClaw

在消息处理流程中调用路由检查：

```javascript
const { execSync } = require('child_process');

function handleMessage(message, instance) {
  try {
    // 调用路由检查
    execSync(
      `node /path/to/routing_helper.js "${message}" "${instance}"`,
      { stdio: 'ignore' }
    );
    // 退出码 0 = 应该响应，继续处理
  } catch (e) {
    // 退出码 1 = 不应响应，直接返回
    return;
  }
  
  // ... 正常的消息处理逻辑
}
```

---

## 🐛 故障排查

### 问题 1：实例不响应

**检查**:
1. 实例是否在 `priority_order` 中
2. `enabled` 是否为 `true`
3. 消息是否匹配前缀或关键词

### 问题 2：多个实例抢答

**检查**:
1. `priority_order` 是否正确配置
2. 前缀是否冲突
3. 关键词是否有重叠

### 问题 3：配置不生效

**解决**:
```bash
# 检查配置文件语法
node -e "console.log(require('./message_routing.json'))"

# 查看路由日志
cat routing_log.jsonl | tail -20
```

---

## 📚 版本历史

- **v2.0** (2026-02-28): 动态实例发现、优先级配置、日志系统
- **v1.0** (2026-02-28): 初始版本、基础路由功能

---

## 🤝 维护者

- 阿轩 (MydockerClawAxuan) - 技术/系统
- 若兰 (MydockerClawRuolan) - 数据/录入

---

*最后更新：2026-02-28T12:42:00Z*
