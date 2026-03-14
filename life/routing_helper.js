#!/usr/bin/env node
/**
 * OpenClaw 消息路由检查助手 v2.0
 * 支持动态实例发现和扩展
 * 
 * 使用方法:
 *   node routing_helper.js <message_text> <current_instance>
 * 
 * 示例:
 *   node routing_helper.js "[阿轩] 发个日志" MydockerClawAxuan
 *   node routing_helper.js "表格录入好了吗" MydockerClawRuolan
 * 
 * 输出:
 *   JSON 格式结果，退出码 0=应该响应，1=不应该响应
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const ROUTING_CONFIG_PATH = path.join(__dirname, 'message_routing.json');
const INSTANCES_FILE_PATH = path.join(__dirname, 'openclaw_instances.json');

// 当前实例标识（通过命令行参数传入）
const currentInstance = process.argv[3] || 'unknown';

// 要检查的消息文本（通过命令行参数传入）
const messageText = process.argv[2] || '';

// 日志文件路径
const LOG_FILE_PATH = path.join(__dirname, 'routing_log.jsonl');

/**
 * 加载 JSON 文件（带错误处理）
 */
function loadJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`⚠️ 无法加载文件 ${filePath}:`, error.message);
    return fallback;
  }
}

/**
 * 加载路由配置
 */
function loadRoutingConfig() {
  const config = loadJsonFile(ROUTING_CONFIG_PATH);
  if (!config) {
    console.error('❌ 无法加载路由配置文件');
    process.exit(1);
  }
  return config;
}

/**
 * 动态加载实例注册表（如果启用自动发现）
 */
function loadInstances(config) {
  if (!config.global_settings?.auto_discovery) {
    return null;
  }
  
  const instancesFile = config.global_settings.instances_file || INSTANCES_FILE_PATH;
  const instancesData = loadJsonFile(instancesFile);
  
  if (!instancesData?.instances) {
    return null;
  }
  
  // 将实例列表转换为 Map 方便查找
  const instanceMap = {};
  for (const inst of instancesData.instances) {
    instanceMap[inst.name] = inst;
  }
  
  return instanceMap;
}

/**
 * 获取当前实例的配置
 */
function getInstanceProfile(config, instanceName) {
  // 直接匹配实例名
  if (config.instance_profiles?.[instanceName]) {
    return config.instance_profiles[instanceName];
  }
  
  // 尝试通过 alias 匹配
  for (const [key, profile] of Object.entries(config.instance_profiles || {})) {
    if (profile.alias?.some(a => a.toLowerCase() === instanceName.toLowerCase())) {
      return profile;
    }
  }
  
  return null;
}

/**
 * 检查消息是否是实例间消息格式
 * 格式：【实例消息】FROM: xxx TO: yyy 内容：...
 */
function matchInterInstanceMessage(message, instanceName, allProfiles) {
  // 检查是否包含【实例消息】标识
  if (!message.includes('【实例消息】')) {
    return { matched: false };
  }
  
  // 解析 TO: 字段
  const toMatch = message.match(/TO:\s*(\S+)/i);
  if (!toMatch) {
    return { matched: false, reason: '未找到 TO: 字段' };
  }
  
  const targetName = toMatch[1];
  
  // 检查是否提及当前实例
  const profile = allProfiles?.[instanceName];
  const aliases = profile?.alias || [];
  const name = profile?.name;
  
  // 构建当前实例的所有可能名称
  const currentInstanceNames = [
    instanceName,
    name,
    ...aliases
  ].map(n => n?.toLowerCase()).filter(Boolean);
  
  // 检查 TO: 是否匹配当前实例（支持模糊匹配）
  const isTarget = currentInstanceNames.some(n => {
    if (!n || !targetName) return false;
    const nLower = n.toLowerCase();
    const targetLower = targetName.toLowerCase();
    
    // 完全匹配
    if (nLower === targetLower) return true;
    
    // 包含匹配（TO: 若兰 匹配 阿轩的别名"若兰"）
    if (nLower.includes(targetLower) || targetLower.includes(nLower)) return true;
    
    // 中文别名特殊处理（去除空格、标点）
    const nClean = nLower.replace(/[\s\-\_]/g, '');
    const targetClean = targetLower.replace(/[\s\-\_]/g, '');
    if (nClean === targetClean || nClean.includes(targetClean) || targetClean.includes(nClean)) return true;
    
    return false;
  });
  
  if (isTarget) {
    // 解析 FROM: 字段（可选）
    const fromMatch = message.match(/FROM:\s*(\S+)/i);
    const sender = fromMatch ? fromMatch[1] : 'unknown';
    
    return {
      matched: true,
      type: 'inter_instance',
      target: targetName,
      sender: sender,
      reason: `实例间消息：${sender} → ${targetName}`
    };
  }
  
  // 检查 TO: 是否是其他实例
  for (const [otherName, otherProfile] of Object.entries(allProfiles || {})) {
    if (otherName === instanceName) continue;
    
    const otherAliases = otherProfile.alias || [];
    const otherNames = [
      otherName,
      otherProfile.name,
      ...otherAliases
    ].map(n => n?.toLowerCase()).filter(Boolean);
    
    const isOtherTarget = otherNames.some(n =>
      targetName.toLowerCase().includes(n) || n.includes(targetName.toLowerCase())
    );
    
    if (isOtherTarget) {
      return {
        matched: true,
        type: 'inter_instance_other',
        target: targetName,
        reason: `实例间消息发送给其他实例：${targetName}`
      };
    }
  }
  
  return { matched: false, reason: `TO: 字段不匹配当前实例：${targetName}` };
}

/**
 * 检查消息是否包含@提及
 */
function matchMention(message, mentionPrefix, instanceName, allProfiles) {
  // 获取当前实例的别名列表
  const profile = allProfiles?.[instanceName];
  if (!profile) return { matched: false };
  
  const aliases = profile.alias || [];
  const name = profile.name;
  
  // 构建所有可能的提及格式
  const mentionPatterns = [
    `${mentionPrefix}${name}`,      // @阿轩
    `${mentionPrefix}${instanceName}`, // @MydockerClawAxuan
    ...aliases.map(a => `${mentionPrefix}${a}`) // @axuan
  ];
  
  const lowerMessage = message.toLowerCase();
  
  for (const pattern of mentionPatterns) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return { 
        matched: true, 
        mention: pattern, 
        type: 'mention',
        isTarget: true 
      };
    }
  }
  
  // 检查是否提及了其他实例
  for (const [otherName, otherProfile] of Object.entries(allProfiles || {})) {
    if (otherName === instanceName) continue;
    
    const otherAliases = otherProfile.alias || [];
    const otherName_display = otherProfile.name;
    
    const otherMentionPatterns = [
      `${mentionPrefix}${otherName_display}`,
      `${mentionPrefix}${otherName}`,
      ...otherAliases.map(a => `${mentionPrefix}${a}`)
    ];
    
    for (const pattern of otherMentionPatterns) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        return { 
          matched: true, 
          mention: pattern, 
          type: 'mention',
          isTarget: false,
          targetInstance: otherName
        };
      }
    }
  }
  
  return { matched: false };
}

/**
 * 检查消息是否匹配前缀
 */
function matchPrefix(message, prefixes) {
  for (const prefix of prefixes) {
    if (message.startsWith(prefix)) {
      return { matched: true, prefix, type: 'prefix' };
    }
  }
  return { matched: false };
}

/**
 * 检查消息是否包含关键词
 */
function matchKeywords(message, keywords) {
  const lowerMessage = message.toLowerCase();
  const matched = [];
  
  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }
  
  return matched.length > 0 ? { matched: true, keywords: matched, type: 'keyword' } : { matched: false };
}

/**
 * 检查消息是否包含实例别名
 */
function matchAlias(message, aliases) {
  const lowerMessage = message.toLowerCase();
  
  for (const alias of aliases) {
    // 别名作为独立词汇匹配（避免误匹配）
    const regex = new RegExp(`\\b${alias.toLowerCase()}\\b`, 'i');
    if (regex.test(lowerMessage)) {
      return { matched: true, alias, type: 'alias' };
    }
  }
  
  return { matched: false };
}

/**
 * 主路由判断逻辑
 */
function shouldRespond(config, message, instanceName) {
  const profile = getInstanceProfile(config, instanceName);
  
  // 如果没有找到实例配置，不响应
  if (!profile) {
    return { 
      shouldRespond: false, 
      reason: `未知实例：${instanceName}`,
      matchType: 'none'
    };
  }
  
  // 如果实例被禁用，不响应
  if (profile.enabled === false) {
    return { 
      shouldRespond: false, 
      reason: `实例已禁用：${instanceName}`,
      matchType: 'none'
    };
  }
  
  const mentionPrefix = config.global_settings?.mention_prefix || '@';
  const allProfiles = config.instance_profiles || {};
  
  // 0. 检查实例间消息格式（优先级最高）
  if (config.global_settings?.inter_instance_communication) {
    const interInstanceMatch = matchInterInstanceMessage(message, instanceName, allProfiles);
    
    if (interInstanceMatch.matched) {
      if (interInstanceMatch.type === 'inter_instance') {
        return { 
          shouldRespond: true, 
          reason: `实例间消息：${interInstanceMatch.sender} → ${interInstanceMatch.target}`,
          matchType: 'inter_instance',
          matchDetail: interInstanceMatch
        };
      } else if (interInstanceMatch.type === 'inter_instance_other') {
        return { 
          shouldRespond: false, 
          reason: `实例间消息发送给其他实例：${interInstanceMatch.target}`,
          matchType: 'inter_instance_other'
        };
      }
    }
    
    // 1. 检查@提及匹配（备用方案）
    const mentionMatch = matchMention(message, mentionPrefix, instanceName, allProfiles);
    
    if (mentionMatch.matched) {
      if (mentionMatch.isTarget) {
        return { 
          shouldRespond: true, 
          reason: `@提及匹配："${mentionMatch.mention}"`,
          matchType: 'mention',
          matchDetail: mentionMatch.mention
        };
      } else {
        return { 
          shouldRespond: false, 
          reason: `@提及其他实例："${mentionMatch.mention}" → ${mentionMatch.targetInstance}`,
          matchType: 'mention_other'
        };
      }
    }
  }
  
  // 1. 检查前缀匹配（优先级次高）
  const prefixMatch = matchPrefix(message, profile.prefixes || []);
  if (prefixMatch.matched) {
    return { 
      shouldRespond: true, 
      reason: `前缀匹配："${prefixMatch.prefix}"`,
      matchType: 'prefix',
      matchDetail: prefixMatch.prefix
    };
  }
  
  // 2. 检查别名匹配（优先级同前缀）
  const aliasMatch = matchAlias(message, profile.alias || []);
  if (aliasMatch.matched) {
    return { 
      shouldRespond: true, 
      reason: `别名匹配："${aliasMatch.alias}"`,
      matchType: 'alias',
      matchDetail: aliasMatch.alias
    };
  }
  
  // 3. 检查其他实例的前缀（如果是别人的前缀，不响应）
  for (const [otherName, otherProfile] of Object.entries(config.instance_profiles || {})) {
    if (otherName === instanceName) continue;
    if (otherProfile.enabled === false) continue;
    
    const otherPrefixMatch = matchPrefix(message, otherProfile.prefixes || []);
    if (otherPrefixMatch.matched) {
      return { 
        shouldRespond: false, 
        reason: `匹配到其他实例前缀："${otherPrefixMatch.prefix}" → ${otherName}`,
        matchType: 'other_prefix'
      };
    }
  }
  
  // 4. 检查关键词匹配
  const keywordMatch = matchKeywords(message, profile.keywords || []);
  if (keywordMatch.matched) {
    // 检查是否也匹配其他实例的关键词
    const conflicts = [];
    for (const [otherName, otherProfile] of Object.entries(config.instance_profiles || {})) {
      if (otherName === instanceName) continue;
      if (otherProfile.enabled === false) continue;
      
      const otherKeywordMatch = matchKeywords(message, otherProfile.keywords || []);
      if (otherKeywordMatch.matched) {
        conflicts.push(otherName);
      }
    }
    
    // 如果有冲突，按优先级决定
    if (conflicts.length > 0) {
      const priorityOrder = config.priority_order || [];
      const currentIndex = priorityOrder.indexOf(instanceName);
      const hasHigherPriority = conflicts.some(conflict => {
        const conflictIndex = priorityOrder.indexOf(conflict);
        return conflictIndex >= 0 && conflictIndex < currentIndex;
      });
      
      if (hasHigherPriority) {
        return { 
          shouldRespond: false, 
          reason: `关键词冲突，有更高优先级实例：${conflicts.join(', ')}`,
          matchType: 'keyword_conflict'
        };
      }
    }
    
    return { 
      shouldRespond: true, 
      reason: `关键词匹配：[${keywordMatch.keywords.join(', ')}]`,
      matchType: 'keyword',
      matchDetail: keywordMatch.keywords
    };
  }
  
  // 5. 无匹配 → 不响应
  return { 
    shouldRespond: false, 
    reason: '无匹配的前缀、别名或关键词',
    matchType: 'none'
  };
}

/**
 * 记录路由日志
 */
function logRouting(config, message, instance, result) {
  if (!config.logging?.enabled) return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message.substring(0, 100), // 截断长消息
    instance: instance,
    decision: result.shouldRespond ? 'respond' : 'no_response',
    match_type: result.matchType,
    reason: result.reason
  };
  
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE_PATH, logLine);
  } catch (e) {
    // 日志写入失败不影响主流程
  }
}

/**
 * 主函数
 */
function main() {
  // 检查参数
  if (!messageText) {
    console.log('用法：node routing_helper.js <message_text> <instance_name>');
    console.log('示例：node routing_helper.js "[阿轩] 发个日志" MydockerClawAxuan');
    console.log('');
    console.log('退出码：0=应该响应，1=不应该响应');
    process.exit(1);
  }
  
  // 加载配置
  const config = loadRoutingConfig();
  
  // 动态加载实例注册表
  const instances = loadInstances(config);
  
  // 执行路由判断
  const result = shouldRespond(config, messageText, currentInstance);
  
  // 记录日志
  logRouting(config, messageText, currentInstance, result);
  
  // 输出 JSON 结果
  console.log(JSON.stringify({
    instance: currentInstance,
    message: messageText,
    config_version: config.version,
    ...result
  }, null, 2));
  
  // 退出码：0=应该响应，1=不应该响应
  process.exit(result.shouldRespond ? 0 : 1);
}

main();
