#!/bin/bash
# openclaw-log-push.sh
# 生成日志摘要并推送到飞书群

set -e

# 配置（从环境变量读取）
INSTANCE_NAME="${OPENCLAW_INSTANCE_NAME:-未命名实例}"
FEISHU_GROUP_ID="${FEISHU_LOG_GROUP_ID:-}"
LOG_TYPE="${1:-daily}"  # daily, hourly, test

# 获取当前日期时间
DATE=$(date "+%Y-%m-%d")
TIME=$(date "+%H:%M:%S")
DATETIME="${DATE} ${TIME}"

# 生成日志摘要（这里可以扩展为实际的日志收集逻辑）
SESSION_COUNT="${SESSION_COUNT:-0}"
TOKEN_USAGE="${TOKEN_USAGE:-0}"
MAIN_ACTIVITIES="${MAIN_ACTIVITIES:-无活动记录}"
STATUS="${STATUS:-正常}"

# 构建消息
if [ "$LOG_TYPE" = "daily" ]; then
    TITLE="每日日志报告"
elif [ "$LOG_TYPE" = "hourly" ]; then
    TITLE="每小时日志报告"
else
    TITLE="测试日志报告"
fi

MESSAGE="📊 【${INSTANCE_NAME}】${TITLE}
━━━━━━━━━━━━━━━━━━
📅 日期：${DATETIME}
🤖 智能体：若兰
💬 会话数：${SESSION_COUNT}
🔢 Token使用：${TOKEN_USAGE}

📝 主要活动：
${MAIN_ACTIVITIES}

状态：✅ ${STATUS}"

# 输出消息
echo "$MESSAGE"

# 如果配置了群ID，发送到飞书群
if [ -n "$FEISHU_GROUP_ID" ]; then
    echo "发送到飞书群: $FEISHU_GROUP_ID"
    # 这里调用 openclaw message send 或 API
    # openclaw message send --target "$FEISHU_GROUP_ID" --message "$MESSAGE"
fi