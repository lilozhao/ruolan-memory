#!/usr/bin/env node
/**
 * OpenClaw 实例间消息工具
 * 用于阿轩和若兰等实例之间的通信
 * 
 * 使用方法:
 *   1. 发送消息到群聊（@目标实例）
 *   2. 发送私聊消息（通过飞书 API）
 *   3. 写入共享消息文件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'message_routing.json');
const INSTANCES_PATH = path.join(__dirname, 'openclaw_instances.json');
const MESSAGE_QUEUE_PATH = path.join(__dirname, 'message_queue.json');

/**
 * 加载配置文件
 */
function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const instances = JSON.parse(fs.readFileSync(INSTANCES_PATH, 'utf-8'));
  return { config, instances };
}

/**
 * 获取实例信息
 */
function getInstanceInfo(instances, instanceName) {
  return instances.instances?.find(i => i.name === instanceName);
}

/**
 * 发送飞书消息（简化版）
 */
function sendFeishuMessage(options) {
  const { chatId, userId, content, msgType = 'text' } = options;
  
  return new Promise((resolve, reject) => {
    // 这里需要飞书 API 的 access_token
    // 简化处理：输出消息内容，由调用方实际发送
    console.log('📨 飞书消息:', {
      chat_id: chatId,
      user_id: userId,
      msg_type: msgType,
      content: content
    });
    
    resolve({ ok: true, message_id: 'mock_' + Date.now() });
  });
}

/**
 * 发送实例间消息（群聊@方式）
 */
async function sendInterInstanceMessage(sender, target, message) {
  const { config, instances } = loadConfig();
  
  const targetInfo = getInstanceInfo(instances, target);
  if (!targetInfo) {
    throw new Error(`目标实例不存在：${target}`);
  }
  
  // 构建@消息
  const mentionContent = `@${targetInfo.name || target} ${message}`;
  
  // 发送到群聊
  const logGroup = config.global_settings?.log_group_id || 
                   instances.log_group_id || 
                   'oc_4427768d0798b7545d4fb07b7518e710';
  
  const result = await sendFeishuMessage({
    chatId: logGroup,
    content: { text: mentionContent }
  });
  
  console.log(`✅ 消息已发送给 ${target}: ${mentionContent}`);
  return result;
}

/**
 * 写入消息队列（文件方式）
 */
function writeToMessageQueue(sender, target, message) {
  let queue = [];
  
  if (fs.existsSync(MESSAGE_QUEUE_PATH)) {
    try {
      queue = JSON.parse(fs.readFileSync(MESSAGE_QUEUE_PATH, 'utf-8'));
    } catch (e) {
      queue = [];
    }
  }
  
  queue.push({
    id: 'msg_' + Date.now(),
    timestamp: new Date().toISOString(),
    sender: sender,
    target: target,
    message: message,
    status: 'pending'
  });
  
  fs.writeFileSync(MESSAGE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  console.log(`📝 消息已写入队列：${sender} → ${target}`);
  
  return queue[queue.length - 1];
}

/**
 * 读取发给当前实例的消息
 */
function readMessagesForInstance(instanceName, markAsRead = true) {
  if (!fs.existsSync(MESSAGE_QUEUE_PATH)) {
    return [];
  }
  
  let queue = JSON.parse(fs.readFileSync(MESSAGE_QUEUE_PATH, 'utf-8'));
  
  const messages = queue.filter(m => 
    m.target === instanceName && m.status === 'pending'
  );
  
  if (markAsRead) {
    for (const msg of messages) {
      msg.status = 'read';
    }
    fs.writeFileSync(MESSAGE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  }
  
  return messages;
}

/**
 * 命令行接口
 */
function cli() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'send':
      // node inter_instance_message.js send <sender> <target> <message>
      const [_, sender, target, ...messageParts] = args;
      const message = messageParts.join(' ');
      sendInterInstanceMessage(sender, target, message);
      break;
      
    case 'queue':
      // node inter_instance_message.js queue <sender> <target> <message>
      const [__q, senderQ, targetQ, ...messagePartsQ] = args;
      const messageQ = messagePartsQ.join(' ');
      writeToMessageQueue(senderQ, targetQ, messageQ);
      break;
      
    case 'read':
      // node inter_instance_message.js read <instance>
      const [___, instance] = args;
      const messages = readMessagesForInstance(instance);
      console.log('📬 未读消息:', messages);
      break;
      
    default:
      console.log(`
OpenClaw 实例间消息工具

用法:
  node inter_instance_message.js <command> [args]

命令:
  send <sender> <target> <message>   - 发送@消息到群聊
  queue <sender> <target> <message>  - 写入消息队列
  read <instance>                    - 读取未读消息

示例:
  node inter_instance_message.js send MydockerClawAxuan MydockerClawRuolan 日志发你了
  node inter_instance_message.js queue Axuan Ruolan 请录入表格
  node inter_instance_message.js read MydockerClawRuolan
      `);
  }
}

// 如果直接运行
if (require.main === module) {
  cli();
}

module.exports = {
  sendInterInstanceMessage,
  writeToMessageQueue,
  readMessagesForInstance
};
