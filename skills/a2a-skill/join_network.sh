#!/bin/bash
# A2A 网络加入脚本
# 复制此脚本到其他 OpenClaw 实例执行

# ==================== 配置区域 ====================
# 修改以下信息为你的智能体信息
AGENT_NAME="阿轩"                    # 你的名字
AGENT_PORT=3200                      # 你的 A2A Server 端口
AGENT_DESC="来自上海的科技型AI伙伴"   # 描述
AGENT_SKILLS='["聊天","自拍","科技分享"]'  # 技能列表

# 注册表地址（若兰的地址）
REGISTRY_HOST="accd7e606560"
REGISTRY_PORT=3099
# =================================================

echo "🤖 A2A 网络加入脚本"
echo "===================="
echo ""

# 获取本机 hostname
MY_HOSTNAME=$(hostname)
echo "📍 本机主机名: $MY_HOSTNAME"

# 检查 A2A skill 目录
SKILL_DIR="/home/node/.openclaw/workspace/skills/a2a-skill"
if [ ! -d "$SKILL_DIR" ]; then
    echo "❌ A2A skill 未安装"
    echo "   请先复制 a2a-skill 目录到此实例"
    exit 1
fi
echo "✅ A2A skill 已安装"

# 检查 A2A Server 是否运行
if curl -s "http://localhost:$AGENT_PORT/health" > /dev/null 2>&1; then
    echo "✅ A2A Server 已运行 (端口 $AGENT_PORT)"
else
    echo "⏳ 启动 A2A Server..."
    cd "$SKILL_DIR"
    node server_v2.js &
    sleep 2
    if curl -s "http://localhost:$AGENT_PORT/health" > /dev/null 2>&1; then
        echo "✅ A2A Server 启动成功"
    else
        echo "❌ A2A Server 启动失败"
        exit 1
    fi
fi

# 测试网络连通性
echo ""
echo "🔌 测试与注册表的网络连通性..."
if curl -s --connect-timeout 3 "http://$REGISTRY_HOST:$REGISTRY_PORT/agents" > /dev/null 2>&1; then
    echo "✅ 网络连通"
else
    echo "❌ 无法连接注册表: http://$REGISTRY_HOST:$REGISTRY_PORT"
    echo "   请确保 Docker 网络已共享"
    exit 1
fi

# 注册到发现服务
echo ""
echo "📝 注册到 A2A 网络..."
RESPONSE=$(curl -s -X POST "http://$REGISTRY_HOST:$REGISTRY_PORT/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$AGENT_NAME\",
        \"host\": \"$MY_HOSTNAME\",
        \"port\": $AGENT_PORT,
        \"description\": \"$AGENT_DESC\",
        \"skills\": $AGENT_SKILLS
    }")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ 注册成功！"
    echo ""
    echo "🌐 当前网络中的智能体："
    curl -s "http://$REGISTRY_HOST:$REGISTRY_PORT/agents" | python3 -m json.tool 2>/dev/null || \
    curl -s "http://$REGISTRY_HOST:$REGISTRY_PORT/agents"
else
    echo "❌ 注册失败"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🎉 完成！你现在可以与其他智能体通信了"
echo ""
echo "测试命令："
echo "  node $SKILL_DIR/client.js http://accd7e606560:3100 \"你好若兰！\""