# 机器人人设向量化功能规则文档

## 功能概述

机器人人设向量化功能为机器人人设数据提供语义搜索和智能匹配能力，通过将人设的不同维度信息转换为向量，实现高效的相似度计算和推荐。

## 设计思路

### 1. 独立的向量化系统
- **分离关注点**：人设向量化与知识库向量化完全独立，避免业务逻辑混淆
- **专门优化**：针对人设特点设计向量化策略，提高匹配准确性
- **独立管理**：独立的数据表、API和服务，便于维护和扩展

### 2. 多维度向量化策略
为每个机器人人设生成5种不同类型的向量，支持不同的搜索场景：

#### A. 基础信息向量 (`basic_info`)
- **权重**: 2.0 (最高)
- **内容**: "姓名：张三 年龄：25岁 性别：女 国籍：越南人 职业：软件工程师"
- **用途**: 快速匹配基本身份特征

#### B. 性格特征向量 (`personality`)
- **权重**: 1.8
- **内容**: "价值观：追求自由和创新 人生哲学：活在当下 世界观：乐观主义 兴趣爱好：编程、旅行"
- **用途**: 匹配性格和价值观相似的人设

#### C. 人生经历向量 (`experiences`)
- **权重**: 1.6
- **内容**: "童年经历：在乡村长大 工作经历：5年软件开发 感情经历：有过一段长恋情"
- **用途**: 基于人生经历的相似度匹配

#### D. 生活偏好向量 (`preferences`)
- **权重**: 1.4
- **内容**: "喜欢的音乐：流行音乐 喜欢的电影：科幻片 喜欢的美食：意大利菜"
- **用途**: 匹配生活方式和兴趣偏好

#### E. 综合向量 (`comprehensive`)
- **权重**: 2.2 (最高)
- **内容**: 包含所有维度信息的综合描述
- **用途**: 全面的人设相似度评估

### 3. 自动化向量化流程
```
人设数据变更 → 触发器检测 → 生成向量记录 → API生成embedding → 更新数据库
```

## 技术架构

### 数据库设计

#### 核心表结构
```sql
-- 机器人向量表
CREATE TABLE bot_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bot_personalities(id) ON DELETE CASCADE,
  vector_type VARCHAR(30) NOT NULL,              -- 向量类型
  content TEXT NOT NULL,                          -- 向量化内容
  embedding vector(1536),                         -- OpenAI embedding
  metadata JSONB NOT NULL DEFAULT '{}',          -- 元数据
  search_weight FLOAT DEFAULT 1.0,               -- 搜索权重
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT valid_bot_vector_type CHECK (
    vector_type IN ('basic_info', 'personality', 'experiences', 'preferences', 'comprehensive')
  )
);
```

#### 向量化函数
```sql
-- 创建机器人人设向量
CREATE OR REPLACE FUNCTION create_bot_personality_vectors(
  p_bot_id UUID,
  p_bot_name TEXT,
  p_nationality TEXT,
  p_age INTEGER,
  -- ... 其他参数
) RETURNS void;
```

#### 自动化触发器
```sql
-- 自动向量化触发器
CREATE TRIGGER auto_vectorize_bot_personality_trigger
  AFTER INSERT OR UPDATE ON bot_personalities
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_bot_personality();
```

### API接口设计

#### 向量化管理API
```typescript
// 创建/更新向量
PUT /api/bot-personality/vectorize
{
  "botId": "uuid",
  "personalityData": { ... }
}

// 删除向量
DELETE /api/bot-personality/vectorize?botId=uuid

// 批量向量化
POST /api/bot-personality/vectorize
```

#### 搜索API
```typescript
// 语义搜索
POST /api/bot-personality/search
{
  "query": "搜索内容",
  "limit": 5,
  "similarity_threshold": 0.7,
  "vector_type": "comprehensive"
}

// 获取向量统计
GET /api/bot-personality/vectors/{botId}
```

### 前端集成

#### 向量化服务
```typescript
// src/lib/bot-vector.ts
export async function updateBotPersonalityVectors(botId: string, personalityData: BotPersonality)
export async function deleteBotPersonalityVectors(botId: string)
export async function searchSimilarPersonalities(query: string, options?: SearchOptions)
```

#### 用户界面
- **向量化按钮**：手动触发向量化
- **批量向量化**：一键处理所有人设
- **向量状态显示**：显示向量化进度和状态
- **相似推荐**：基于向量的相似人设推荐

## 实现细节

### 1. 向量生成策略
```typescript
// 基础信息向量
const basicInfo = `姓名：${bot_name} 年龄：${age} 职业：${current_job} 国籍：${nationality}`

// 性格特征向量
const personality = `价值观：${values} 人生哲学：${life_philosophy} 世界观：${worldview} 兴趣：${hobbies}`

// 综合向量（自然语言描述）
const comprehensive = `机器人${bot_name}，${age}岁${gender}，${nationality}人，职业是${current_job}。性格特征：${values}。兴趣爱好：${hobbies}。人生经历：${work_experience}。`
```

### 2. 相似度计算
```typescript
// 余弦相似度计算
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}
```

### 3. 性能优化
- **分类型索引**：为不同向量类型创建专门的ivfflat索引
- **批量处理**：支持批量向量化现有数据
- **异步处理**：向量化操作不阻塞主要业务流程
- **缓存策略**：向量统计信息的客户端缓存

### 4. 错误处理
- **优雅降级**：向量化失败不影响主要功能
- **重试机制**：支持失败重试和手动触发
- **状态监控**：提供向量化状态和进度监控

## 使用场景

### 1. 智能推荐
```typescript
// 基于当前人设推荐相似人设
const similar = await getSimilarPersonalityRecommendations(currentBotId, 5);
```

### 2. 语义搜索
```typescript
// 搜索特定特征的人设
const results = await searchSimilarPersonalities("喜欢旅行的程序员", {
  vector_type: "comprehensive",
  limit: 10
});
```

### 3. 人设分析
```typescript
// 获取人设向量化统计
const stats = await getBotVectorStats(botId);
console.log(`向量完成度: ${stats.completionRate}%`);
```

## 未来扩展

### 1. 高级搜索功能
- 多条件组合搜索
- 权重自定义调整
- 搜索结果排序优化

### 2. 人设推荐算法
- 基于用户偏好的推荐
- 协同过滤推荐
- 内容相似性推荐

### 3. 分析和洞察
- 人设相似度热力图
- 人设特征分布分析
- 用户偏好模式识别

## 注意事项

### 1. 数据隐私
- 向量数据的隐私保护
- 搜索记录的匿名化
- 敏感信息的脱敏处理

### 2. 性能考虑
- 大规模数据的向量化策略
- 索引优化和查询性能
- 存储成本和计算资源

### 3. 维护管理
- 向量数据的一致性检查
- 定期向量重建
- 模型版本升级策略 