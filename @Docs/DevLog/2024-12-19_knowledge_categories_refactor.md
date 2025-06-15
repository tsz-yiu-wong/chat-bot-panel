# 2024-12-19 开发日志 - 知识库分类结构重构

## 修改概述

将知识库（缩写库和话术库）的分类从字符串字段改为独立分类表结构，支持越南文（中文）双语显示。

## 数据库结构变更

### 1. 新增独立分类表

#### knowledge_categories（缩写库分类表）
```sql
CREATE TABLE knowledge_categories (
    id UUID PRIMARY KEY,
    name_vi VARCHAR(255) NOT NULL,  -- 越南文名称（必填）
    name_cn VARCHAR(255),           -- 中文名称（可选）
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### knowledge_scenarios（话术库场景表）
```sql
CREATE TABLE knowledge_scenarios (
    id UUID PRIMARY KEY,
    name_vi VARCHAR(255) NOT NULL,  -- 越南文名称（必填）
    name_cn VARCHAR(255),           -- 中文名称（可选）
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 业务表结构调整

#### knowledge_abbreviations 表
- 新增：`category_id UUID` 外键字段
- 保留：`category VARCHAR(100)` 字段（兼容过渡期）
- 外键约束：`FOREIGN KEY (category_id) REFERENCES knowledge_categories(id)`

#### knowledge_scripts 表
- 新增：`scenario_id UUID` 外键字段
- 保留：`scenario VARCHAR(100)` 字段（兼容过渡期）
- 外键约束：`FOREIGN KEY (scenario_id) REFERENCES knowledge_scenarios(id)`

### 3. 数据迁移策略

- 自动识别现有分类数据中的中文和越南文
- 中文数据：插入到 `name_cn` 字段，`name_vi` 设为 'Khác'
- 越南文数据：插入到 `name_vi` 字段，`name_cn` 为 NULL
- 更新业务表的 `_id` 外键字段
- 保留原字段便于回滚

### 4. 向量化功能更新

- 更新向量化函数以支持新的分类结构
- 在向量元数据中包含分类的中越双语信息
- 保持向量搜索功能的完整性

## 前端修改

### 1. 显示格式统一
- 所有分类显示格式：`越南文名称（中文名称）`
- 如果中文名称为空，只显示越南文名称

### 2. 表单修改
- 编辑/新建分类时，第一行为越南文输入框（必填）
- 第二行为中文输入框（非必填）
- Label翻译：
  - 缩写库分类：`Danh mục từ viết tắt`（越南文）
  - 话术库场景：`Kịch bản đối thoại`（越南文）

### 3. 数据结构适配
- 修改API调用以使用新的分类表
- 更新状态管理以支持分类的增删改查
- 保持向后兼容性

## 技术要点

### 数据库层面
- 使用 `IF NOT EXISTS` 确保幂等性
- 外键约束设置为 `ON DELETE SET NULL` 避免级联删除
- 创建适当的索引优化查询性能
- 软删除支持（`is_deleted` 字段）

### 应用层面
- 乐观更新策略保持UI响应性
- 错误回滚机制确保数据一致性
- 分类缓存机制减少数据库查询

### 兼容性考虑
- 保留原有字符串字段便于回滚
- 数据迁移脚本支持增量执行
- API向后兼容

## 测试重点

1. **数据迁移测试**
   - 验证现有分类数据正确迁移
   - 检查外键关联正确建立
   - 确认软删除功能正常

2. **前端功能测试**
   - 分类的增删改查功能
   - 显示格式正确性
   - 表单验证规则

3. **向量搜索测试**
   - 验证向量化函数正常工作
   - 搜索结果包含正确的分类信息

## 部署步骤

1. 执行数据库迁移脚本：`knowledge_base_categories_schema.sql`
2. 部署前端代码更新
3. 验证功能正常性
4. 监控系统性能和错误日志

## 后续优化

- 考虑添加分类图标支持
- 实现分类的拖拽排序功能
- 添加分类使用统计功能
- 支持分类的批量导入导出 