# 向量检索逻辑规则文档

**创建日期**: 2024-12-19  
**功能模块**: Vector Search System  
**相关文件**: `src/app/api/chat/vectors/route.ts`

## 检索逻辑概述

系统采用 **混合检索策略**：**阈值过滤 + 数量限制 + 相似度排序**

## 检索流程

### 1. 参数接收
```javascript
POST /api/chat/vectors
{
  "query": "搜索文本",
  "session_id": "uuid",           // 可选：限制在特定会话
  "limit": 5,                     // 返回数量限制（默认5）
  "similarity_threshold": 0.7,    // 相似度阈值（默认0.7）
  "exclude_message_id": "uuid",   // 可选：排除特定消息
  "vector_type": "message",       // 向量类型（默认message）
  "include_context": false        // 是否包含上下文向量
}
```

### 2. 向量生成
```javascript
// 使用 OpenAI text-embedding-3-small 模型
const queryEmbedding = await generateEmbedding(query);

// 如果向量生成失败，回退到文本搜索
if (queryEmbedding.length === 0) {
  // 使用 PostgreSQL ILIKE 进行模糊匹配
  // 返回默认相似度 0.5
}
```

### 3. 数据库查询策略

#### 预过滤条件
```sql
SELECT * FROM chat_message_vectors 
WHERE embedding IS NOT NULL           -- 只查询已向量化的记录
AND (session_id = ? OR session_id IS NOT NULL)  -- 会话过滤（可选）
AND message_id != ?                   -- 排除特定消息（可选）  
AND vector_type = ?                   -- 向量类型过滤
```

#### 向量类型过滤
- **默认**: `vector_type = 'message'` （只搜索消息向量）
- **包含上下文**: `vector_type IN ('message', 'context')` （包含上下文向量）

### 4. 相似度计算

#### 余弦相似度算法
```javascript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}
```

#### 相似度范围
- **完全匹配**: 1.0
- **高度相似**: 0.8-0.99
- **中等相似**: 0.6-0.79
- **低度相似**: 0.4-0.59
- **不相似**: < 0.4

### 5. 结果过滤和排序

#### 阈值过滤
```javascript
// 只保留相似度 >= similarity_threshold 的结果
if (similarity >= similarity_threshold) {
  results.push({
    vector_id: vector.id,
    message_id: vector.message_id,
    session_id: vector.session_id,
    content: vector.content,
    vector_type: vector.vector_type,
    similarity: similarity,
    // ... 其他字段
  });
}
```

#### 排序和数量限制
```javascript
// 按相似度降序排序
results.sort((a, b) => b.similarity - a.similarity);

// 限制返回数量
const limitedResults = results.slice(0, limit);
```

## 检索策略对比

### 当前策略：阈值 + 数量
- **逻辑**: 先过滤阈值，再限制数量
- **优势**: 保证结果质量，避免低质量匹配
- **劣势**: 可能返回少于期望的结果数量

#### 示例
```
设置: threshold=0.7, limit=5
候选结果: [0.9, 0.8, 0.75, 0.6, 0.5, 0.4]
过滤后: [0.9, 0.8, 0.75]
最终返回: 3条结果
```

### 替代策略：仅数量限制
- **逻辑**: 不设阈值，只按相似度排序取前N个
- **优势**: 始终返回指定数量的结果
- **劣势**: 可能包含低质量匹配

#### 示例
```
设置: limit=5
候选结果: [0.9, 0.8, 0.75, 0.6, 0.5, 0.4]
最终返回: [0.9, 0.8, 0.75, 0.6, 0.5] (5条结果)
```

## 不同场景的阈值建议

### 聊天历史检索
- **精确匹配**: `threshold >= 0.8`
- **相关内容**: `threshold >= 0.6` 
- **模糊搜索**: `threshold >= 0.4`

### 知识库检索（在message/route.ts中）
- **人设匹配**: `threshold = 0.2` （宽松，寻找相关人设特征）
- **缩写识别**: `threshold = 0.3` （中等，确保相关性）
- **话术匹配**: `threshold = 0.4`，高相似度 `>= 0.7` 强制使用

## 性能优化

### 数据库索引
```sql
-- 向量搜索优化索引
CREATE INDEX idx_chat_message_vectors_session_type ON chat_message_vectors(session_id, vector_type);
CREATE INDEX idx_chat_message_vectors_created_desc ON chat_message_vectors(created_at DESC);
CREATE INDEX idx_chat_message_vectors_message ON chat_message_vectors(message_id);
```

### 内存优化
- 批量计算相似度，避免频繁数据库查询
- 向量embedding 缓存（当前每次都重新计算）

### API限制
- OpenAI embedding API 有频率限制
- 添加延迟控制：`setTimeout(resolve, 100)`

## 错误处理

### 向量解析异常
```javascript
try {
  embedding = JSON.parse(vector.embedding);
} catch {
  continue; // 跳过无效向量
}
```

### 维度不匹配
```javascript
if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
  continue; // 跳过维度不匹配的向量
}
```

### 回退机制
```javascript
// 向量搜索失败时回退到文本搜索
let textQuery = supabase
  .from('chat_message_vectors')
  .select('...')
  .ilike('content', `%${query}%`)
  .limit(limit);
```

## 返回结果格式

```javascript
{
  "results": [
    {
      "vector_id": "uuid",
      "message_id": "uuid", 
      "session_id": "uuid",
      "content": "消息内容",
      "vector_type": "message",
      "similarity": 0.85,
      "created_at": "2024-12-19T...",
      "session_name": "会话名称",
      "user_name": "用户名",
      "message_role": "user|assistant"
    }
  ],
  "total": 10,           // 符合阈值的总数量
  "query": "搜索词",
  "similarity_threshold": 0.7,
  "session_id": "uuid"
}
```

## 配置建议

### 默认参数调优
- **limit**: 5-10 （平衡性能和内容丰富度）
- **similarity_threshold**: 0.6-0.7 （平衡精度和召回率）
- **vector_type**: 'message' （主要搜索消息内容）

### 场景化配置
- **客服FAQ**: 高阈值(0.8+)，低数量(3-5)
- **内容推荐**: 中阈值(0.6)，中数量(5-10)  
- **模糊搜索**: 低阈值(0.4)，高数量(10-20) 