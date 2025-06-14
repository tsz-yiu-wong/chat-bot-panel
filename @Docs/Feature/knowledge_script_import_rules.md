# 知识库话术导入功能规则文档

## 功能概述

知识库话术导入功能旨在将 CSV 格式的话术数据批量导入到系统中，并自动生成多维度的向量索引，为语义搜索和智能问答提供支持。

## 设计思路

### 1. 数据处理流程
```
CSV文件 → 数据解析 → 场景映射 → 数据插入 → 向量生成 → 索引构建
```

### 2. 多向量策略
为每条话术创建5种不同类型的向量，提高搜索准确性：
- **scenario**: 场景匹配 - 用于识别对话场景
- **intent**: 意图理解 - 用于理解用户意图  
- **response**: 回答内容 - 用于匹配合适的回答
- **context**: 上下文 - 用于理解完整对话上下文
- **keyword**: 关键词 - 用于关键词搜索

### 3. 双语场景支持
自动将中文场景名称映射为双语格式，支持中文和越南文场景识别。

## 技术实现

### 1. 数据库设计

#### 核心表结构
```sql
-- 话术库表
knowledge_scripts (
  id UUID PRIMARY KEY,
  scenario VARCHAR(100) NOT NULL,    -- 双语场景名称
  text TEXT NOT NULL,                -- 用户输入/问题
  answer TEXT NOT NULL,              -- 系统回答
  priority INTEGER DEFAULT 1,       -- 优先级
  is_active BOOLEAN DEFAULT TRUE,    -- 是否激活
  created_at/updated_at             -- 时间戳
)

-- 向量表
knowledge_vectors (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,         -- 关联话术ID
  document_type VARCHAR(20),         -- 文档类型: 'script'
  vector_type VARCHAR(30),           -- 向量类型
  content TEXT NOT NULL,             -- 向量化内容
  embedding vector(1536),            -- OpenAI embedding
  metadata JSONB,                    -- 元数据
  search_weight FLOAT DEFAULT 1.0,   -- 搜索权重
  created_at/updated_at
)
```

#### 自动向量化触发器
```sql
-- 插入/更新话术时自动创建向量记录
CREATE TRIGGER auto_vectorize_script_trigger
  AFTER INSERT OR UPDATE ON knowledge_scripts
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_script();
```

### 2. 导入脚本架构

#### 主要模块
1. **CSV解析器**: 读取和解析CSV文件
2. **场景映射器**: 中文→越南文场景名称转换
3. **数据插入器**: 批量插入话术数据
4. **向量生成器**: 调用OpenAI API生成embedding
5. **错误处理器**: 处理各种异常情况

#### 核心函数设计
```javascript
// 向量生成
async function generateEmbedding(text)
// 更新向量embedding
async function updateVectorEmbeddings(documentId)
// 批量向量化
async function vectorizeAllPendingRecords()
```

### 3. 错误处理策略

#### 分级处理
1. **致命错误**: 停止全部处理（配置错误、文件不存在）
2. **记录级错误**: 跳过当前记录，继续处理其他记录
3. **向量错误**: 记录失败，保留原始数据

#### 重试机制
- OpenAI API调用失败时支持重试
- 提供独立的向量化模式（--vectorize-only）

## 业务规则

### 1. 场景映射规则
```javascript
const scenarioMapping = {
  '洗投资': 'Thuyết phục đầu tư',
  '包装自己': 'Giới thiệu bản thân',
  '包装创业经历': 'Chia sẻ kinh nghiệm khởi nghiệp',
  // ... 更多映射
};
```

### 2. 向量内容生成规则
```javascript
// 场景向量: 纯场景信息
scenario: `场景: ${scenario}`

// 意图向量: 用户输入内容  
intent: text

// 回答向量: 系统回答内容
response: answer

// 上下文向量: 完整对话
context: `${text} | ${answer}`

// 关键词向量: 场景 + 清理后的文本
keyword: `${scenario} ${cleanedText}`
```

### 3. 优先级规则
- 默认优先级: 1
- 范围: 1-10（数据库约束）
- 高优先级记录在搜索时排序靠前

### 4. 搜索权重规则
- scenario: 2.0（最高权重）
- intent: 1.8
- response: 1.5  
- context: 1.3
- keyword: 1.2

## 使用规范

### 1. CSV文件格式要求
```csv
场景,话术,越南文修正
洗投资,"原始话术内容","修正后的话术内容"
```

### 2. 命令行参数
- `node import-scripts.js`: 标准导入
- `--clear`: 清空现有数据后导入
- `--vectorize-only`: 仅向量化现有数据

### 3. 环境变量要求
```env
NEXT_PUBLIC_SUPABASE_URL=required
SUPABASE_SERVICE_ROLE_KEY=required  
OPENAI_API_KEY=optional # 不配置则跳过向量化
```

## 性能考虑

### 1. API限制处理
- OpenAI API调用间隔: 100-200ms
- 批量处理: 逐条处理避免并发限制
- 失败重试: 单独模式处理失败记录

### 2. 数据库优化
- 使用事务处理批量插入
- 向量索引使用ivfflat算法
- 分类型创建向量索引提高查询性能

### 3. 内存管理
- 流式处理CSV文件，避免全量加载
- 逐条处理向量生成，避免内存溢出

## 监控和日志

### 1. 导入统计
- 总记录数、成功数、失败数
- 各场景分布统计
- 向量化进度追踪

### 2. 错误日志
- 详细的错误信息和堆栈
- 失败记录的标识信息
- API调用失败原因

### 3. 性能指标
- 导入速度（记录/秒）
- API调用延迟
- 数据库操作耗时

## 后续优化方向

### 1. 功能增强
- 支持更多文件格式（Excel、JSON）
- 增量更新模式
- 数据去重逻辑

### 2. 性能优化
- 并行向量生成（在API限制内）
- 向量缓存机制
- 断点续传功能

### 3. 运维改进
- Web界面导入工具
- 实时进度显示
- 导入历史记录

## 质量保证

### 1. 数据验证
- CSV格式校验
- 必填字段检查
- 数据长度限制

### 2. 测试策略
- 单元测试: 核心函数逻辑
- 集成测试: 完整导入流程
- 压力测试: 大量数据导入

### 3. 回滚机制
- 导入前数据备份
- 失败时自动回滚
- 手动清理工具 