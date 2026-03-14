#!/usr/bin/env node
/**
 * parse-log-message.js
 * 解析日志摘要消息并记录到 Feishu Bitable
 * 
 * 用法: node parse-log-message.js "消息内容" "发送者名称"
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN;
const TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID;
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;

const FEISHU_API = 'https://open.feishu.cn/open-apis';

/**
 * 判断消息是否是日志摘要格式
 */
function isLogSummary(message) {
  if (!message) return false;
  // 检查是否以📊开头，包含日志报告或工作摘要
  return message.includes('📊') && 
         (message.includes('日志报告') || message.includes('工作摘要'));
}

/**
 * 解析日志消息，提取字段
 */
function parseLogMessage(message) {
  const result = {
    instanceName: '',
    date: '',
    agent: '',
    sessions: '',
    tokens: '',
    activities: '',
    status: '正常'
  };
  
  try {
    // 提取实例名：【实例名】
    const instanceMatch = message.match(/【(.+?)】/);
    if (instanceMatch) {
      result.instanceName = instanceMatch[1];
    }
    
    // 提取日期：📅 日期：2026-02-27
    const dateMatch = message.match(/📅\s*日期[：:]\s*(.+)/);
    if (dateMatch) {
      result.date = dateMatch[1].trim();
    }
    
    // 提取智能体：🤖 智能体：若兰
    const agentMatch = message.match(/🤖\s*智能体[：:]\s*(.+)/);
    if (agentMatch) {
      result.agent = agentMatch[1].trim();
    }
    
    // 提取会话数：💬 会话数：15
    const sessionsMatch = message.match(/💬\s*会话数[：:]\s*(.+)/);
    if (sessionsMatch) {
      result.sessions = sessionsMatch[1].trim();
    }
    
    // 提取Token：🔢 Token使用：125,000
    const tokensMatch = message.match(/🔢\s*Token[使用：:\s]+(.+)/);
    if (tokensMatch) {
      result.tokens = tokensMatch[1].trim();
    }
    
    // 提取主要活动
    const activitiesMatch = message.match(/📝\s*主要活动[：:]\s*([\s\S]+?)(?=状态|$)/);
    if (activitiesMatch) {
      result.activities = activitiesMatch[1].trim();
    }
    
    // 提取状态
    const statusMatch = message.match(/状态[：:]\s*[✅❌]?\s*(.+)/);
    if (statusMatch) {
      result.status = statusMatch[1].trim();
    }
    
  } catch (error) {
    console.error('解析消息失败:', error);
  }
  
  return result;
}

/**
 * 获取飞书 access_token
 */
async function getAccessToken() {
  const response = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取 token 失败：${data.msg}`);
  }
  return data.tenant_access_token;
}

/**
 * 解析数字字符串（去除逗号等符号）
 */
function parseNumber(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[,，]/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * 记录到 Feishu Bitable
 */
async function recordToBitable(parsed) {
  if (!APP_TOKEN || !TABLE_ID) {
    console.log('⚠️ Bitable 配置缺失，跳过记录');
    return null;
  }
  
  const token = await getAccessToken();
  
  // 生成序号（时间戳）
  const now = new Date();
  const seqNum = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  const fields = {
    '序号': seqNum,
    '日期时间': parsed.date || now.toISOString().slice(0, 16).replace('T', ' '),
    'openclaw名': parsed.instanceName,
    '智能体': parsed.agent,
    '会话数': parseNumber(parsed.sessions),
    'Tocken使用': parseNumber(parsed.tokens),
    '主要活动': parsed.activities,
    '原始消息': '',  // 不存储原始消息，节省空间
    '状态': parsed.status
  };
  
  console.log('📝 准备记录到 Bitable:', JSON.stringify(fields, null, 2));
  
  const response = await fetch(`${FEISHU_API}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`记录失败：${data.msg}`);
  }
  
  return data.data;
}

/**
 * 主函数
 */
async function main() {
  const message = process.argv[2];
  const senderName = process.argv[3] || '未知';
  
  if (!message) {
    console.log('用法: node parse-log-message.js "消息内容" "发送者名称"');
    process.exit(1);
  }
  
  console.log(`📥 收到消息 (发送者: ${senderName})`);
  console.log('消息预览:', message.slice(0, 100) + '...');
  
  // 检查是否是日志摘要
  if (!isLogSummary(message)) {
    console.log('⏭️  不是日志摘要格式，跳过');
    process.exit(0);
  }
  
  console.log('✅ 识别为日志摘要格式');
  
  // 解析消息
  const parsed = parseLogMessage(message);
  console.log('📊 解析结果:', JSON.stringify(parsed, null, 2));
  
  // 记录到 Bitable
  try {
    const result = await recordToBitable(parsed);
    console.log('✅ 已记录到 Feishu Bitable:', result);
  } catch (error) {
    console.error('❌ 记录失败:', error.message);
    process.exit(1);
  }
}

main();