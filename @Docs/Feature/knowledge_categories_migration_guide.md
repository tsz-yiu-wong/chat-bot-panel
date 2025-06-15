# 知识库分类结构重构迁移指南

## 概述

将知识库（缩写库和话术库）的分类从字符串字段改为独立分类表结构，支持越南文（中文）双语显示格式。

## 数据库结构变更

### 1. 新增分类表

已创建的SQL文件：`database/knowledge_base_categories_schema.sql`

#### 新表结构
```sql
-- 缩写库分类表
CREATE TABLE knowledge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(255) NOT NULL,  -- 越南文名称（必填）
    name_cn VARCHAR(255),           -- 中文名称（可选）
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 话术库场景表
CREATE TABLE knowledge_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(255) NOT NULL,  -- 越南文名称（必填）
    name_cn VARCHAR(255),           -- 中文名称（可选）
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 业务表字段调整
```sql
-- 为现有表添加外键字段
ALTER TABLE knowledge_abbreviations ADD COLUMN category_id UUID;
ALTER TABLE knowledge_scripts ADD COLUMN scenario_id UUID;

-- 添加外键约束
ALTER TABLE knowledge_abbreviations ADD CONSTRAINT fk_abbreviations_category 
    FOREIGN KEY (category_id) REFERENCES knowledge_categories(id) ON DELETE SET NULL;
ALTER TABLE knowledge_scripts ADD CONSTRAINT fk_scripts_scenario 
    FOREIGN KEY (scenario_id) REFERENCES knowledge_scenarios(id) ON DELETE SET NULL;
```

### 2. 数据迁移

迁移脚本会自动：
- 识别现有分类数据中的中文和越南文
- 中文数据插入到 `name_cn` 字段，`name_vi` 设为 'Khác'
- 越南文数据插入到 `name_vi` 字段，`name_cn` 为 NULL
- 更新业务表的外键字段

### 3. 向量化功能更新

更新了向量化函数以支持新的分类结构：
- `create_abbreviation_vectors_with_category_support()`
- `create_script_vectors_with_scenario_support()`
- 更新了自动向量化触发器

## 前端修改要点

### 1. 类型定义更新

```typescript
interface KnowledgeCategory {
  id: string
  name_vi: string
  name_cn: string | null
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

interface KnowledgeScenario {
  id: string
  name_vi: string
  name_cn: string | null
  sort_order: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

interface Abbreviation {
  id: string
  category?: string  // 保留原字段用于兼容
  category_id: string | null
  category_data?: KnowledgeCategory
  // ... 其他字段
}
```

### 2. 显示格式函数

```typescript
const formatCategoryName = (category: KnowledgeCategory | KnowledgeScenario): string => {
  if (category.name_cn) {
    return `${category.name_vi} (${category.name_cn})`
  }
  return category.name_vi
}
```

### 3. 表单Label翻译

#### 缩写库分类
- 越南文输入框：`Danh mục từ viết tắt`（必填）
- 中文输入框：`大类名称`（非必填）

#### 话术库场景  
- 越南文输入框：`Kịch bản đối thoại`（必填）
- 中文输入框：`小类名称`（非必填）

### 4. API调用更新

#### 查询时包含关联数据
```typescript
const { data, error } = await supabase
  .from('knowledge_abbreviations')
  .select(`
    *,
    category_data:knowledge_categories!category_id(*)
  `)
  .eq('is_deleted', false)
```

#### 插入时使用外键
```typescript
await supabase
  .from('knowledge_abbreviations')
  .insert([{
    category_id: abbreviationForm.category_id,
    abbreviation: abbreviationForm.abbreviation,
    // ...
  }])
```

## 部署步骤

### 1. 数据库迁移
```bash
# 执行分类表创建和数据迁移
psql -d your_database -f database/knowledge_base_categories_schema.sql
```

### 2. 验证迁移结果
```sql
-- 检查分类表数据
SELECT * FROM knowledge_categories WHERE is_deleted = FALSE;
SELECT * FROM knowledge_scenarios WHERE is_deleted = FALSE;

-- 检查外键关联
SELECT COUNT(*) FROM knowledge_abbreviations WHERE category_id IS NOT NULL;
SELECT COUNT(*) FROM knowledge_scripts WHERE scenario_id IS NOT NULL;
```

### 3. 前端代码部署
- 更新类型定义
- 修改API调用
- 更新表单组件
- 调整显示逻辑

## 兼容性考虑

### 向后兼容
- 保留原有字符串字段（`category`, `scenario`）
- 新增外键字段为可空
- API可同时支持新旧格式

### 渐进式迁移
1. 部署数据库结构变更
2. 部署支持新结构的前端代码
3. 验证功能正常
4. 逐步删除旧字段（可选）

## 测试清单

### 数据完整性
- [ ] 所有现有分类正确迁移到新表
- [ ] 外键关联正确建立
- [ ] 软删除功能正常

### 前端功能
- [ ] 分类显示格式为"越南文（中文）"
- [ ] 创建/编辑分类功能正常
- [ ] 表单验证规则正确
- [ ] 搜索和筛选功能正常

### 向量搜索
- [ ] 向量化函数正常工作
- [ ] 搜索结果包含正确的分类信息
- [ ] 元数据包含分类的双语信息

## 故障排除

### 常见问题

1. **外键约束错误**
   - 检查分类表是否正确创建
   - 确认数据迁移完成

2. **前端类型错误**
   - 确认类型定义匹配数据库结构
   - 检查可空字段的处理

3. **向量搜索异常**
   - 验证向量化函数更新
   - 检查触发器是否正确替换

### 回滚方案

如需回滚到原有结构：
1. 停止使用新的分类表
2. 恢复前端代码使用字符串分类
3. 可选：删除新增的外键字段

## 后续优化

- 添加分类图标支持
- 实现分类的拖拽排序
- 支持分类的批量导入导出
- 添加分类使用统计 