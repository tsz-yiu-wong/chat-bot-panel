# 机器人人设向量化系统多语言支持更新

**日期**: 2024-12-19  
**功能**: 机器人人设向量化多语言支持  
**更新类型**: 功能增强

## 更新概述

对机器人人设向量化系统进行了重大升级，添加了完整的多语言支持，优化了content格式，并修复了相关问题。

## 主要更新内容

### 1. 多语言向量化函数

创建了新的数据库函数 `create_bot_personality_vectors_with_language()`，支持：

- **语言参数**: 接受 `p_language` 参数（'zh'中文, 'vi'越南文）
- **动态标签**: 根据语言自动选择对应的字段标签
- **字段顺序**: 按照表单字段顺序构建content
- **格式优化**: 每个字段添加句号结尾，提升可读性

### 2. 前端集成

更新了前端保存逻辑：

- 保存机器人时传递当前页面语言参数
- 创建机器人时传递语言参数  
- API自动调用多语言向量化函数

### 3. 向量类型优化

增加了新的向量类型并重新组织：

1. **基础信息向量** (`basic_info`): 姓名、年龄、性别、国籍、职业等基本信息
2. **生活偏好向量** (`preferences`): 音乐、电影、时尚、美食等偏好
3. **性格特征向量** (`personality`): 兴趣爱好、世界观、人生观、价值观
4. **人生经历向量** (`experiences`): 童年、成长、感情、工作、创业经历
5. **未来梦想向量** (`dreams`): 想去的地方、人生梦想、未来想法
6. **综合向量** (`comprehensive`): 所有信息的自然语言描述

### 4. 数据库约束更新

更新了向量类型约束，支持新增的 `dreams` 向量类型：

```sql
CONSTRAINT valid_bot_vector_type CHECK (
  vector_type IN ('basic_info', 'personality', 'experiences', 'preferences', 'comprehensive', 'dreams')
)
```

### 5. Content格式示例

#### 中文格式
```
姓名：小明。年龄：25。性别：男。国籍：中国。现在的工作：软件工程师。
```

#### 越南文格式  
```
Họ tên：小明。Tuổi：25。Giới tính：男。Quốc tịch：中国。Công việc hiện tại：软件工程师。
```

## 技术实现细节

### 数据库函数特点

1. **标签动态化**: 根据 `p_language` 参数选择中文或越南文标签
2. **时间戳保持**: 更新时保持原始 `created_at` 时间戳
3. **空值处理**: 只为非空字段生成content
4. **分类权重**: 不同向量类型有不同的搜索权重
5. **元数据记录**: 在metadata中记录语言信息

### API集成

- **POST /api/bot-personality**: 创建时支持language参数
- **PUT /api/bot-personality**: 更新时支持language参数  
- **PUT /api/bot-personality/vectorize**: 向量化API支持多语言

### 前端更新

- 机器人页面保存时传递当前语言
- 自动向量化过程对用户透明
- 保持现有用户体验

## 问题修复

### 1. 向量类型约束错误
**问题**: 新函数创建6种向量类型，但约束只允许5种  
**解决**: 更新约束添加 `dreams` 类型

### 2. 综合向量硬编码中文
**问题**: comprehensive向量使用硬编码中文标签  
**解决**: 根据language参数动态选择标签

### 3. Content格式不规范
**问题**: 字段间只有空格分隔，不够清晰  
**解决**: 每个字段添加句号，按表单顺序排列

## 兼容性说明

- 现有向量数据不受影响
- 默认语言为中文('zh')
- 老版本API调用自动使用中文标签
- 向量搜索功能完全兼容

## 后续计划

1. 测试多语言向量搜索效果
2. 优化向量embedding质量
3. 考虑添加更多语言支持
4. 性能监控和优化

## 文件变更清单

- `database/bot_personality_vectors_schema.sql` - 更新主schema文件
- `database/migrations/add_multilingual_vectorization.sql` - 新增迁移文件
- `src/app/api/bot-personality/route.ts` - API路由更新
- `src/app/api/bot-personality/vectorize/route.ts` - 向量化API更新
- `src/app/bots/page.tsx` - 机器人页面更新
- `src/lib/bot-vector.ts` - 向量服务更新 