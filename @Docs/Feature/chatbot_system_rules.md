# 聊天机器人系统功能规则文档

## 概述

聊天机器人系统是一个支持智能对话的完整解决方案，包含用户管理、会话管理、消息处理、LLM集成和向量检索等核心功能。

## 设计理念

### 核心原则

1. **用户概念分离**: 明确区分聊天终端用户和后台管理员用户
2. **消息合并处理**: 避免频繁LLM调用，提升用户体验和成本控制
3. **双重存储架构**: 支持界面展示和智能检索的不同需求
4. **扩展性优先**: 为未来功能扩展预留接口和数据结构

### 技术选型

- **后端框架**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **LLM服务**: OpenAI API (可切换至自定义服务)
- **向量存储**: PostgreSQL + JSON格式（兼容pgvector）
- **前端**: React + TypeScript + Tailwind CSS

## 系统架构

### 数据模型设计

#### 用户体系架构
```sql
-- 聊天终端用户（与机器人对话的用户）
chat_users {
  id: UUID PRIMARY KEY
  username: VARCHAR(100) UNIQUE    -- 用户名
  display_name: VARCHAR(100)       -- 显示名称
  avatar_url: TEXT                -- 头像URL
  metadata: JSONB                 -- 扩展信息
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  is_deleted: BOOLEAN
}

-- 后台管理员用户（管理系统的用户）
users {  -- 已存在
  user_id: UUID PRIMARY KEY
  username: VARCHAR(100)
  role: VARCHAR(20)
  -- 其他管理员相关字段
}
```

#### 标签系统设计
```sql
-- 用户标签定义
chat_user_tags {
  id: UUID PRIMARY KEY
  tag_name: VARCHAR(50) UNIQUE     -- 标签名称
  tag_color: VARCHAR(20)           -- 标签颜色
  description: TEXT                -- 标签描述
  is_active: BOOLEAN               -- 是否激活
}

-- 用户标签关联
chat_user_tag_relations {
  id: UUID PRIMARY KEY
  user_id: UUID → chat_users(id)
  tag_id: UUID → chat_user_tags(id)
  assigned_by: VARCHAR(50)         -- 分配者：system/admin/auto
  assigned_at: TIMESTAMPTZ
  UNIQUE(user_id, tag_id)          -- 防重复
}
```

#### 会话管理架构
```sql
chat_sessions {
  id: UUID PRIMARY KEY
  user_id: UUID → chat_users(id)
  bot_personality_id: UUID → bot_personalities(id)
  session_name: VARCHAR(200)
  
  -- 消息处理配置
  message_merge_seconds: INTEGER   -- 消息合并间隔(秒)
  
  -- 话题推送配置
  topic_trigger_hours: INTEGER     -- 话题触发间隔(小时)
  is_topic_enabled: BOOLEAN        -- 是否启用话题推送
  
  -- 时间戳
  last_message_at: TIMESTAMPTZ     -- 最后消息时间
  last_processed_at: TIMESTAMPTZ   -- 最后处理时间
  
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  is_deleted: BOOLEAN
}
```

#### 消息存储架构
```sql
-- 明文消息存储（用于界面显示）
chat_messages {
  id: UUID PRIMARY KEY
  session_id: UUID → chat_sessions(id)
  user_id: UUID → chat_users(id)
  role: VARCHAR(20)                -- user/assistant/system/topic
  content: TEXT                    -- 消息内容
  metadata: JSONB                  -- 扩展信息
  is_processed: BOOLEAN            -- 是否已处理
  merge_group_id: UUID             -- 消息合并组ID
  created_at: TIMESTAMPTZ
}

-- 向量化存储（用于检索）
chat_vectors {
  id: UUID PRIMARY KEY
  session_id: UUID → chat_sessions(id)
  message_id: UUID → chat_messages(id)
  content: TEXT                    -- 向量化文本
  embedding: TEXT                  -- 向量数据(JSON格式)
  vector_type: VARCHAR(50)         -- message/summary/context
  created_at: TIMESTAMPTZ
}
```

### API接口设计规范

#### 统一响应格式
```typescript
// 成功响应
{
  success?: boolean,
  data?: any,
  message?: string,
  pagination?: {
    limit: number,
    offset: number,
    total: number
  }
}

// 错误响应
{
  error: string,
  details?: any
}
```

#### 接口版本控制
- 当前版本: v1 (无版本前缀)
- 未来版本: `/api/v2/chat/*`

#### 认证和授权
- 当前: 无认证（MVP阶段）
- 规划: 基于JWT的用户认证

## 核心功能实现

### 1. 消息合并处理机制

#### 设计思路
用户在聊天过程中可能连续发送多条短消息，如果每条消息都立即调用LLM，会导致：
- API调用成本过高
- 响应延迟增加
- 上下文理解困难

#### 实现方案
```typescript
// 消息处理流程
class MessageProcessor {
  async sendMessage(sessionId: string, content: string) {
    // 1. 存储消息（标记为未处理）
    await this.storeMessage({
      session_id: sessionId,
      content,
      is_processed: false
    });
    
    // 2. 更新会话时间戳
    await this.updateSessionTimestamp(sessionId);
    
    // 3. 返回排队状态
    return { status: 'queued' };
  }

  async processMessages(sessionId: string, force = false) {
    // 1. 检查合并时间
    if (!force && !this.shouldProcess(sessionId)) {
      return { message: '还未到合并时间' };
    }

    // 2. 获取待处理消息
    const pendingMessages = await this.getPendingMessages(sessionId);
    
    // 3. 合并消息内容
    const mergedContent = pendingMessages
      .map(msg => msg.content)
      .join('\n\n');

    // 4. 调用LLM生成回复
    const aiResponse = await this.callLLM(sessionId, mergedContent);

    // 5. 存储回复和标记已处理
    await this.storeAIResponse(sessionId, aiResponse, pendingMessages);
  }
}
```

#### 配置参数
- `message_merge_seconds`: 消息合并间隔（默认300秒）
- 支持会话级别配置
- 支持强制处理模式（测试用）

### 2. LLM集成架构

#### 服务抽象层
```typescript
interface LLMProvider {
  chat(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
  chatWithHistory(messages: ChatMessage[], options?: LLMOptions): Promise<LLMResponse>;
  generateEmbedding(text: string): Promise<number[]>;
}

class OpenAIProvider implements LLMProvider {
  // OpenAI API 实现
}

class CustomLLMProvider implements LLMProvider {
  // 自定义云服务器 LLM 实现
}
```

#### Prompt构建策略
```typescript
function buildSystemPrompt(personality: BotPersonality): string {
  return `你是${personality.bot_name}，一个AI聊天机器人。

个人信息：
- 姓名：${personality.bot_name}
- 性格：${personality.worldview || '友善、乐于助人'}
- 兴趣爱好：${personality.hobbies || '聊天、学习新知识'}

请保持角色设定，用友善和有帮助的方式回应用户。`;
}
```

### 3. 向量检索系统

#### 存储格式
- **embedding字段**: JSON字符串格式，兼容pgvector
- **vector_type**: 区分不同类型的向量（消息/摘要/上下文）

#### 检索策略
```typescript
async function searchSimilarMessages(
  sessionId: string, 
  queryText: string, 
  limit = 5
): Promise<ChatMessage[]> {
  // 1. 生成查询向量
  const queryEmbedding = await llmService.generateEmbedding(queryText);
  
  // 2. 计算相似度（余弦相似度）
  const vectors = await this.getAllVectors(sessionId);
  const similarities = vectors.map(v => ({
    ...v,
    similarity: cosineSimilarity(queryEmbedding, JSON.parse(v.embedding))
  }));
  
  // 3. 排序并返回
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

### 4. 用户标签系统

#### 标签分类
- **系统标签**: 新用户、活跃用户、VIP用户等
- **管理员标签**: 手动分配的业务标签
- **自动标签**: 基于AI分析的行为标签（未来实现）

#### 标签分配策略
```sql
-- 新用户自动标签
TRIGGER after_user_creation:
  CALL add_user_tag(new_user_id, '新用户', 'system');

-- 活跃度标签（定时任务）
UPDATE chat_user_tag_relations SET assigned_at = NOW()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM chat_messages 
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id 
  HAVING COUNT(*) > 50
);
```

## 话题推送系统

### 设计目标
当用户长时间未发消息时，主动发送话题来维持对话活跃度。

### 实现方案
```typescript
// 定时任务：检查需要推送话题的会话
async function checkTopicPush() {
  const sessions = await supabase
    .rpc('get_sessions_needing_topics');
    
  for (const session of sessions) {
    const topic = await this.getRandomTopic();
    await this.sendTopicMessage(session.id, topic);
  }
}

// 话题消息特殊处理
async function sendTopicMessage(sessionId: string, topic: string) {
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'topic',
    content: topic,
    is_processed: true,
    metadata: { type: 'auto_topic', generated_at: new Date() }
  });
}
```

### 话题生成策略
1. **预设话题库**: 存储在 `topics` 表中
2. **个性化话题**: 基于用户标签和聊天历史
3. **时间相关话题**: 节日、天气、新闻等

## 性能优化策略

### 数据库优化
```sql
-- 核心索引
CREATE INDEX idx_chat_messages_session_processed 
ON chat_messages(session_id, is_processed);

CREATE INDEX idx_chat_sessions_last_message 
ON chat_sessions(last_message_at) 
WHERE is_deleted = false;

-- 分区策略（大量数据时）
PARTITION chat_messages BY RANGE (created_at);
```

### API性能优化
- **连接池**: 数据库连接复用
- **缓存策略**: Redis缓存热点数据
- **异步处理**: 消息处理异步化
- **批量操作**: 减少数据库往返次数

### 前端优化
- **虚拟滚动**: 消息列表分页加载
- **防抖处理**: 输入防抖
- **状态管理**: 减少不必要的渲染

## 安全考虑

### 数据保护
- **输入验证**: 严格的参数验证
- **SQL注入防护**: 使用参数化查询
- **XSS防护**: 内容过滤和转义

### 隐私保护
- **数据加密**: 敏感信息加密存储
- **访问日志**: 记录数据访问日志
- **数据清理**: 定期清理过期数据

### API安全
- **限流机制**: 防止API滥用
- **认证授权**: 用户身份验证
- **CORS配置**: 跨域请求控制

## 监控和日志

### 系统监控
- **API响应时间**: 监控接口性能
- **错误率**: 统计错误发生频率
- **资源使用**: 内存、CPU、存储监控

### 业务监控
- **消息处理量**: 每日消息统计
- **用户活跃度**: 用户使用情况
- **LLM调用统计**: API调用成本分析

### 日志策略
```typescript
// 结构化日志
class Logger {
  logMessage(level: string, action: string, data: any) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      action,
      data,
      service: 'chatbot-api'
    }));
  }
}
```

## 扩展性设计

### 微服务化准备
- **服务边界**: 用户服务、会话服务、消息服务
- **API网关**: 统一入口和路由
- **服务发现**: 动态服务注册

### 多租户支持
- **租户隔离**: 数据和配置隔离
- **资源配额**: 不同租户的使用限制
- **定制化**: 租户级别的功能定制

### 国际化支持
- **多语言**: 消息内容多语言
- **时区处理**: 用户时区适配
- **本地化**: 地区特定功能

## 测试策略

### 单元测试
- **API接口测试**: 每个接口的输入输出验证
- **业务逻辑测试**: 消息处理流程测试
- **数据库操作测试**: CRUD操作验证

### 集成测试
- **端到端测试**: 完整聊天流程测试
- **性能测试**: 高并发场景测试
- **兼容性测试**: 不同客户端兼容性

### 测试工具
- **Jest**: 单元测试框架
- **Playwright**: 端到端测试
- **Artillery**: 性能压测工具

## 部署和运维

### 容器化部署
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 环境配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  chatbot-api:
    build: .
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "3000:3000"
```

### CI/CD流程
1. **代码提交**: Git push触发构建
2. **自动测试**: 运行测试套件
3. **构建镜像**: Docker镜像构建
4. **部署验证**: 健康检查
5. **流量切换**: 蓝绿部署

## 故障排查

### 常见问题
1. **LLM调用失败**: 检查API密钥和网络连接
2. **消息处理卡住**: 检查is_processed状态
3. **数据库连接超时**: 检查连接池配置

### 调试工具
- **日志分析**: 结构化日志查询
- **性能分析**: APM工具集成
- **数据库监控**: 慢查询分析

## 后续发展规划

### 短期目标（1个月）
- 完善测试覆盖率
- 集成知识库检索
- 实现定时任务系统
- 性能优化

### 中期目标（3个月）
- 切换自定义LLM服务
- 实现自动标签系统
- 添加数据分析功能
- 多机器人人设支持

### 长期目标（6个月）
- 微服务架构重构
- 多租户系统
- 高级分析和报表
- 移动端支持 