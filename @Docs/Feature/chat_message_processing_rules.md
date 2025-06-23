# 聊天消息处理规则文档

**创建日期**: 2024-12-19  
**功能模块**: Chat Message Processing  
**相关文件**: `src/app/api/chat/message/route.ts`

## 用户输入处理逻辑

### 1. 消息接收和存储
```javascript
// POST /api/chat/message - 接收用户消息
{
  session_id: "uuid",
  content: "用户输入的内容",
  user_id: "uuid"
}
```

- **每次用户输入都作为独立的消息记录存储**
- **初始状态**: `is_processed = false`（未处理）
- **存储位置**: `chat_messages` 表

### 2. 消息合并机制

#### 触发条件
- 会话有未处理的用户消息（`is_processed = false`）
- 满足以下任一条件：
  - 距离最后一条消息超过 `message_merge_seconds` 秒
  - 手动触发立即处理（`force = true`）

#### 合并逻辑
```javascript
// 获取所有未处理的用户消息
const pendingMessages = await supabase
  .from('chat_messages')
  .select('*')
  .eq('session_id', session_id)
  .eq('role', 'user')
  .eq('is_processed', false)
  .order('created_at', { ascending: true });

// 合并内容（用换行分隔）
const mergedContent = pendingMessages
  .map(msg => msg.content)
  .join('\n\n');
```

#### 示例场景
**用户连续发送**：
1. "你好" → 存储为消息1（未处理）
2. "我想问个问题" → 存储为消息2（未处理）  
3. "关于产品功能" → 存储为消息3（未处理）

**合并后发给AI**：
```
你好

我想问个问题

关于产品功能
```

### 3. 向量化处理

#### 消息级向量化
- **每条原始用户消息**在被标记为已处理时，都会创建独立的向量记录
- **AI回复**作为单独的向量记录存储

#### 向量内容
```sql
-- 用户消息向量
INSERT INTO chat_message_vectors (
    session_id,
    message_id,
    content,        -- 原始单条消息内容
    vector_type,    -- 'message'
    embedding       -- 待生成
);

-- AI回复向量  
INSERT INTO chat_message_vectors (
    session_id,
    message_id,
    content,        -- AI回复内容
    vector_type,    -- 'message'
    embedding       -- 待生成
);

-- AI上下文向量（可选）
INSERT INTO chat_message_vectors (
    session_id,
    message_id,
    content,        -- "AI回复: [内容] | 使用模型: [模型]"
    vector_type,    -- 'context'
    embedding       -- 待生成
);
```

### 4. 处理标记更新

```javascript
// 标记所有未处理消息为已处理
const { error: updateError } = await supabase
  .from('chat_messages')
  .update({ 
    is_processed: true,
    merge_group_id: mergeGroupId,  // 同一批处理的标识
    metadata: {
      processed_at: new Date().toISOString()
    }
  })
  .eq('session_id', session_id)
  .eq('role', 'user')
  .eq('is_processed', false);
```

## 设计考虑

### 优势
1. **保留完整历史**: 每条用户输入都被完整保存
2. **上下文连贯**: 多条消息合并处理，AI能理解完整意图
3. **向量独立性**: 每条消息独立向量化，便于细粒度检索
4. **批量标识**: merge_group_id 标识同一批处理的消息

### 潜在问题
1. **语义混淆**: 多条不相关消息合并可能影响AI理解
2. **检索精度**: 合并后的查询可能匹配到无关向量
3. **处理延迟**: 需要等待合并时间才能响应

### 改进建议
1. **智能分段**: 基于语义相似性决定是否合并
2. **独立处理模式**: 提供单条消息立即处理选项
3. **上下文窗口**: 限制合并消息的数量和总长度

## 配置参数

### 会话级配置
- `message_merge_seconds`: 消息合并等待时间（默认30秒）
- `topic_trigger_hours`: 话题触发间隔（默认24小时）

### API调用参数
- `force`: 强制立即处理
- `history_limit`: 历史消息数量限制（默认10条）
- `language`: 对话语言（zh/vi）

## 相关API端点

### 消息发送
```
POST /api/chat/message
Body: { session_id, content, user_id }
```

### 消息处理
```
PUT /api/chat/message  
Body: { session_id, force?, history_limit?, prompt_id, personality_id, language? }
```

### 向量化
```
PUT /api/chat/vectors
Body: { session_id, batch_size? }
```

## 数据库触发器

### 自动向量化触发器
```sql
-- 消息插入时
CREATE TRIGGER trigger_create_chat_message_vectors
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_message_vectors();

-- 消息状态更新时
CREATE TRIGGER trigger_update_chat_message_vectors
    AFTER UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_vectors();
``` 