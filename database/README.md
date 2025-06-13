# 数据库架构文档

## 概述

本项目的数据库架构已按功能模块重新整理，每个功能模块都有独立的schema文件，便于管理和部署。

## 模块结构

### 1. 用户管理模块 (`user_management_schema.sql`)
**功能**：后台管理用户的登录认证系统
- **表**：`users`
- **函数**：`verify_user_password()`, `update_updated_at_column()`
- **特性**：
  - 四种权限级别：`super_admin`, `admin`, `operator`, `viewer`
  - bcrypt 密码加密
  - 自动时间戳更新
  - 初始化示例用户

### 2. 知识库模块 (`knowledge_base_schema.sql`)
**功能**：缩写库、话术库和AI向量搜索
- **表**：`knowledge_abbreviations`, `knowledge_scripts`, `knowledge_vectors`
- **函数**：`match_documents()`, `get_documents_without_vectors()`
- **特性**：
  - pgvector 向量搜索支持
  - OpenAI embedding 集成
  - 相似度匹配
  - 自动向量化管理

### 3. 话题管理模块 (`topics_management_schema.sql`)
**功能**：三级话题分类管理系统
- **表**：`topic_categories`, `topic_subcategories`, `topics`
- **特性**：
  - 中文/越南语双语支持
  - 三级分类结构
  - 排序功能（从1000开始）
  - 使用统计
  - 级联删除

### 4. 提示词管理模块 (`prompts_management_schema.sql`)
**功能**：AI对话提示词模板管理
- **表**：`prompts`
- **特性**：
  - 多阶段提示词管理
  - 多模型支持
  - 自动命名规则
  - 灵活的内容管理

## 部署顺序

建议按以下顺序部署schema文件：

1. **用户管理模块** - 基础认证功能
2. **提示词管理模块** - AI对话核心
3. **知识库模块** - 需要 pgvector 扩展
4. **话题管理模块** - 对话内容管理

## 使用方法

### 全新部署
```sql
-- 1. 部署用户管理
\i user_management_schema.sql

-- 2. 部署提示词管理
\i prompts_management_schema.sql

-- 3. 部署知识库（需要 pgvector 扩展）
\i knowledge_base_schema.sql

-- 4. 部署话题管理
\i topics_management_schema.sql
```

### 增量更新
每个schema文件都使用了 `IF NOT EXISTS` 和条件检查，可以安全地重复执行。

## 依赖关系

- **pgvector 扩展**：知识库模块必需
- **pgcrypto 扩展**：用户管理模块必需
- **uuid-ossp 扩展**：所有模块都需要

## 数据初始化

每个模块都包含初始化数据：
- **用户管理**：4个不同权限的示例用户
- **话题管理**：3个大类、6个小类、4个示例话题

## 注意事项

1. **权限设置**：确保数据库用户有创建扩展的权限
2. **向量搜索**：需要在 Supabase 或 PostgreSQL 中启用 pgvector
3. **密码安全**：初始密码仅供测试，生产环境请及时修改
4. **排序值**：话题排序从1000开始，便于在前面插入新项目

## 文件说明

| 文件名 | 功能 | 主要表 |
|--------|------|--------|
| `user_management_schema.sql` | 用户认证 | users |
| `knowledge_base_schema.sql` | 知识库+向量搜索 | knowledge_*, vectors |
| `topics_management_schema.sql` | 话题分类管理 | topic_* |
| `prompts_management_schema.sql` | 提示词模板 | prompts | 