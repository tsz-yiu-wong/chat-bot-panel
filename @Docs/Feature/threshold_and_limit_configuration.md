# AI配置管理指南

**创建日期**: 2024-12-19  
**更新日期**: 2024-12-19  
**目的**: 统一管理所有AI相关配置，简化参数调整流程  

## 🎯 配置架构概述

现在所有AI相关配置被整合为两个层级：

1. **全局配置文件** - 影响所有API和功能的默认行为
2. **前端测试界面** - 仅影响测试页面的临时设置

---

## 📁 1. 全局配置文件 (推荐)

### 配置文件位置
**文件**: `src/lib/config/ai-config.ts`

### 配置项说明

#### 向量检索配置 (`vector_search`)
```typescript
vector_search: {
  similarity_threshold: 0.6,    // 相似度阈值 (0-1)
  limit: 5,                     // Top-K结果数量
  vector_type: 'message',       // 向量类型 ('message' | 'context')
  include_context: false        // 是否包含上下文向量
}
```

#### 知识库检索配置 (`knowledge_retrieval`)
```typescript
knowledge_retrieval: {
  // 人设匹配 (AI角色特征识别)
  personality_matching: {
    similarity_threshold: 0.2,  // 宽松阈值，识别相关特征
    limit: 1                    // 只需要最匹配的一个
  },
  
  // 缩写识别 (专业术语解释)
  abbreviation_recognition: {
    similarity_threshold: 0.3,  // 中等严格度
    limit: 10                   // 可能有多个相关缩写
  },
  
  // 话术库检索 (客服回复模板)
  script_library: {
    similarity_threshold: 0.4,   // 基础检索阈值
    limit: 5,                    // 获取多个相关话术
    force_use_threshold: 0.7     // 强制使用话术的高阈值
  },
  
  // 通用知识检索 (文档搜索等)
  general_knowledge: {
    similarity_threshold: 0.5,   // 平衡精度和召回
    limit: 5                     // 标准数量
  }
}
```

#### 聊天处理配置 (`chat_processing`)
```typescript
chat_processing: {
  message_merge_seconds: 30,     // 消息合并等待时间(秒)
  topic_trigger_hours: 24,       // 话题触发间隔(小时)
  history_limit: 10,             // 历史消息数量限制
  batch_size: 10,                // 批量处理大小
  embedding_delay_ms: 100        // 向量生成延迟(毫秒)
}
```

### 预设配置方案

#### 保守模式 (`conservative`)
- 高精度，低召回
- 适合：严肃客服场景，要求回复准确性
- 特点：返回较少但质量高的结果

#### 宽松模式 (`liberal`) 
- 低精度，高召回
- 适合：探索性对话，内容发现
- 特点：返回更多结果，包含边缘相关内容

#### 平衡模式 (`balanced`) - 默认
- 中等精度和召回
- 适合：大部分业务场景
- 特点：平衡准确性和全面性

### 配置修改方法

#### 方法1: 直接修改默认值
```typescript
// 修改 DEFAULT_AI_CONFIG 对象
export const DEFAULT_AI_CONFIG: AIConfig = {
  vector_search: {
    similarity_threshold: 0.7,  // 调整这里
    limit: 8,                   // 调整这里
    // ...
  }
  // ...
}
```

#### 方法2: 运行时切换预设
```typescript
import { loadPreset } from '@/lib/config/ai-config';

// 在代码中切换配置
loadPreset('conservative');  // 切换到保守模式
loadPreset('liberal');       // 切换到宽松模式
loadPreset('balanced');      // 切换到平衡模式
```

#### 方法3: 动态调整特定配置
```typescript
import { setAIConfig } from '@/lib/config/ai-config';

// 只调整向量搜索配置
setAIConfig({
  vector_search: {
    similarity_threshold: 0.8,
    limit: 3
  }
});
```

---

## 🧪 2. 前端测试界面配置

### 位置
**页面**: `/test-chat`  
**状态变量**: `testVectorConfig`

### 配置项
```typescript
testVectorConfig: {
  similarity_threshold: 0.6,  // 测试页面专用阈值
  limit: 5,                   // 测试页面专用限制
  include_context: false      // 是否包含上下文向量
}
```

### 特点
- **独立性**: 不影响其他功能和API
- **实时性**: 修改立即生效，无需重启
- **临时性**: 仅在当前会话有效
- **实验性**: 用于测试不同参数的效果

### 使用建议
1. 在测试页面调试参数效果
2. 确认满意后再修改全局配置
3. 用于比较不同配置的表现

---

## 🚀 参数调优建议

### 相似度阈值 (similarity_threshold)

| 阈值范围 | 效果 | 适用场景 |
|---------|------|----------|
| 0.1-0.3 | 宽松匹配 | 探索发现、内容推荐 |
| 0.4-0.6 | 平衡匹配 | 日常对话、通用搜索 |
| 0.7-0.9 | 严格匹配 | 精确查询、专业问答 |

### 结果数量 (limit)

| 数量 | 性能 | 适用场景 |
|------|------|----------|
| 1-3 | 快 | 单一答案查询 |
| 5-8 | 中等 | 对比选择 |
| 10+ | 慢 | 综合分析 |

### 知识库检索策略

| 模块 | 推荐阈值 | 原因 |
|------|----------|------|
| 人设匹配 | 0.1-0.3 | 需要宽松匹配角色特征 |
| 缩写识别 | 0.3-0.4 | 术语匹配要求中等精度 |
| 话术库 | 0.4-0.5 | 平衡准确性和可用性 |
| 强制话术 | 0.7-0.8 | 只在高度匹配时使用 |

---

## ⚠️ 注意事项

### 性能影响
- **高limit值**: 增加响应时间和计算成本
- **低threshold值**: 可能返回大量无关结果
- **建议**: 根据实际需求平衡精度和性能

### 配置生效
- **全局配置**: 修改后需要重启应用
- **测试配置**: 立即生效
- **运行时配置**: 调用相应函数后生效

### 最佳实践
1. **先测试**: 在测试页面验证参数效果
2. **小步调整**: 每次调整幅度不要太大
3. **记录效果**: 保存有效的配置组合
4. **定期审查**: 根据使用反馈优化配置

---

## 📊 配置效果示例

### 当前默认配置 (threshold=0.6, limit=5)
- 搜索: "产品功能介绍"
- 结果: 3-5条中等相关的内容
- 特点: 平衡精度和召回率

### 保守配置 (threshold=0.8, limit=3)
- 搜索: "产品功能介绍"  
- 结果: 1-2条高度相关的内容
- 特点: 高精度，可能遗漏边缘相关内容

### 宽松配置 (threshold=0.4, limit=10)
- 搜索: "产品功能介绍"
- 结果: 8-10条相关性不等的内容
- 特点: 高召回，但可能包含噪声

---

## 🔧 快速配置指南

### 如果需要更精确的结果
```typescript
// 调整全局配置
const config = {
  vector_search: {
    similarity_threshold: 0.8,
    limit: 3
  }
}
```

### 如果需要更多的结果
```typescript
// 调整全局配置
const config = {
  vector_search: {
    similarity_threshold: 0.4,
    limit: 10
  }
}
```

### 如果AI回复不够准确
```typescript
// 提高话术库阈值
knowledge_retrieval: {
  script_library: {
    similarity_threshold: 0.6,     // 从0.4提升到0.6
    force_use_threshold: 0.8       // 从0.7提升到0.8
  }
}
``` 