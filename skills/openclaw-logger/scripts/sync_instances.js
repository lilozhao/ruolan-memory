#!/usr/bin/env node
/**
 * sync_instances.js
 * 从飞书群获取所有成员信息，保存到实例注册表
 */

const fs = require('fs');
const path = require('path');

// 配置
const LOG_GROUP_ID = process.env.FEISHU_LOG_GROUP_ID;
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const OUTPUT_PATH = '/home/node/.openclaw/workspace/life/openclaw_instances.json';

// 飞书 API
const FEISHU_API = 'https://open.feishu.cn/open-apis';

async function getTenantAccessToken() {
  const response = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET
    })
  });
  
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取 token 失败：${data.msg}`);
  }
  return data.tenant_access_token;
}

async function getChatMembers(token) {
  const response = await fetch(`${FEISHU_API}/im/v1/chats/${LOG_GROUP_ID}/members?member_id_type=open_id`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取成员失败：${data.msg}`);
  }
  return data.data.items;
}

async function syncInstances() {
  console.log('🔄 开始同步群成员列表...');
  console.log(`📍 群 ID: ${LOG_GROUP_ID}`);
  
  try {
    // 获取 token
    const token = await getTenantAccessToken();
    console.log('✅ 获取 access_token 成功');
    
    // 获取成员列表
    const members = await getChatMembers(token);
    console.log(`✅ 获取到 ${members.length} 个成员`);
    
    // 构建实例注册表
    const instances = {
      log_group_id: LOG_GROUP_ID,
      last_sync: new Date().toISOString(),
      instances: members.map(member => ({
        name: member.name,
        user_id: member.member_id,
        status: 'active',
        last_seen: new Date().toISOString()
      }))
    };
    
    // 确保输出目录存在
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存到文件
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(instances, null, 2));
    console.log(`✅ 实例注册表已保存到：${OUTPUT_PATH}`);
    
    // 输出摘要
    console.log('\n📋 成员列表:');
    members.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (${m.member_id})`);
    });
    
    return instances;
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    process.exit(1);
  }
}

// 执行
syncInstances();
