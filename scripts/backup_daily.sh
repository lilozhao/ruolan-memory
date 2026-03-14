#!/bin/bash
# 若兰每日备份脚本
# 将关键记忆文件推送到 Git 远程仓库

set -e

WORKSPACE="/home/node/.openclaw/workspace"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/home/node/.openclaw/workspace/memory/backup.log"

cd "$WORKSPACE"

# 检查是否有远程仓库
if ! git remote | grep -q "origin"; then
    echo "[$DATE] ERROR: No remote repository configured. Please run: git remote add origin <your-gitee-url>" >> "$LOG_FILE"
    exit 1
fi

# 添加关键记忆文件
git add SOUL.md MEMORY.md AGENTS.md IDENTITY.md USER.md TOOLS.md

# 添加 memory 目录下的所有日记
git add memory/

# 检查是否有变更
if git diff --cached --quiet; then
    echo "[$DATE] No changes to backup" >> "$LOG_FILE"
    exit 0
fi

# 提交并推送
git commit -m "Daily backup: $DATE" --author="Ruolan <ruolan@openclaw.ai>"
git push origin master

echo "[$DATE] Backup completed successfully" >> "$LOG_FILE"
echo "Backup completed: $DATE"