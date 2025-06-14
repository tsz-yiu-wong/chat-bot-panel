# 软删除功能实现

**日期**: 2024-12-19  
**功能**: 为知识库、话题库、提示词、机器人管理实现软删除功能  
**影响范围**: 数据库表结构、前端删除逻辑、查询逻辑

## 功能概述

将系统中的硬删除（物理删除）改为软删除（逻辑删除），通过 `is_deleted` 字段标记删除状态，保留数据完整性，支持未来可能的数据恢复需求。

## 数据库变更

### 新增字段
为以下表添加 `is_deleted` 字段：
- `knowledge_abbreviations` - 知识库缩写表
- `knowledge_scripts` - 知识库话术表  
- `topic_categories` - 话题大类表
- `topic_subcategories` - 话题小类表
- `topics` - 话题表
- `prompts` - 提示词表
- `bot_personalities` - 机器人人设表
- `bot_images` - 机器人图片表

### 字段定义
```sql
is_deleted BOOLEAN DEFAULT FALSE
```

### 特殊处理：机器人表字段统一
机器人表原有 `is_active` 字段用于软删除，现统一为 `is_deleted` 字段：
- 添加 `is_deleted` 字段
- 数据迁移：`UPDATE bot_personalities SET is_deleted = true WHERE is_active = false`
- 保留 `is_active` 字段以向后兼容

### 性能优化索引
- 单列索引：所有表的 `is_deleted` 字段
- 复合索引：关联查询优化
  - `topic_subcategories(category_id, is_deleted)`
  - `topics(subcategory_id, is_deleted)`
  - `topics(category_id, is_deleted)`
  - `bot_images(bot_id, is_deleted)`

## 代码变更详情

### 1. 知识库 (`src/app/knowledge/page.tsx`)

#### 查询变更
- `fetchAbbreviations()`: 添加 `.eq('is_deleted', false)`
- `fetchScripts()`: 添加 `.eq('is_deleted', false)`

#### 删除逻辑变更
- **原逻辑**: `DELETE FROM table WHERE id = ?`
- **新逻辑**: `UPDATE table SET is_deleted = true WHERE id = ?`
- **向量处理**: 保持硬删除向量数据，确保搜索准确性
- **错误处理**: 改进回滚机制，失败时恢复UI状态

#### 乐观更新优化
- 立即从前端状态移除删除项
- 数据库操作失败时自动回滚UI状态
- 保持良好的用户体验

### 2. 话题库 (`src/app/topics/page.tsx`)

#### 查询变更
- `fetchAllData()`: 使用 `!inner` JOIN 过滤软删除记录
- 添加级联过滤条件：
  ```sql
  .eq('is_deleted', false)
  .eq('subcategories.is_deleted', false)  
  .eq('subcategories.topics.is_deleted', false)
  ```

#### 级联软删除实现
- **删除大类**: 级联软删除所有子类和话题
  1. 软删除所有相关话题
  2. 软删除所有相关小类  
  3. 软删除大类本身
- **删除小类**: 级联软删除所有话题
  1. 软删除所有相关话题
  2. 软删除小类本身
- **删除话题**: 直接软删除单个话题

#### 事务保证
- 每个级联删除步骤都有错误检查
- 任一步骤失败则整个操作回滚
- 保持数据一致性

### 3. 提示词 (`src/app/prompts/page.tsx`)

#### 查询变更
- `fetchPrompts()`: 添加 `.eq('is_deleted', false)`

#### 删除逻辑变更
- **原逻辑**: `DELETE FROM prompts WHERE id = ?`
- **新逻辑**: `UPDATE prompts SET is_deleted = true WHERE id = ?`
- **简化处理**: 提示词为独立实体，无级联关系

### 4. 机器人管理 (`src/app/bots/page.tsx`)

#### 查询变更
- `loadPersonalities()`: 统一使用 `.eq('is_deleted', false)`
- `loadImages()`: 图片查询添加 `.eq('is_deleted', false)`

#### 删除逻辑变更
- **原逻辑**: `UPDATE SET is_active = false`
- **新逻辑**: `UPDATE SET is_deleted = true`
- **级联处理**: 删除机器人时同步软删除关联图片
- **乐观更新**: 立即更新UI，失败时自动回滚

#### API变更 (`/api/bot-personality`)
- **GET**: 从 `is_active = true` 改为 `is_deleted = false`
- **DELETE**: 从 `is_active = false` 改为 `is_deleted = true`
- **级联删除**: 同时软删除 `bot_images` 表关联记录

#### 图片API变更 (`/api/bot-personality/images`)
- **GET**: 添加 `.eq('is_deleted', false)` 过滤
- **DELETE**: 从硬删除改为软删除，保留Storage文件

## 技术要点

### 1. 查询性能优化
- 使用索引优化 `is_deleted = false` 查询
- 复合索引支持级联查询场景
- `!inner` JOIN 确保只返回未删除的关联数据

### 2. 前端状态管理
- 乐观更新：立即更新UI，提升用户体验
- 错误回滚：操作失败时恢复原始状态
- 状态同步：确保前端状态与数据库一致

### 3. 数据一致性
- 级联删除保证父子关系数据一致性
- 向量数据同步删除（知识库）
- 图片软删除保留Storage文件
- 错误处理确保部分失败不影响数据完整性

### 4. 用户体验
- 删除操作即时响应，无需等待数据库操作
- 失败时自动恢复，用户感知最小化
- 保持原有交互逻辑，用户无感知变更

## 测试验证点

### 功能测试
- [ ] 各模块删除功能正常工作
- [ ] 级联删除逻辑正确（话题库、机器人）
- [ ] 软删除记录不再显示在列表中
- [ ] 创建、编辑功能不受影响
- [ ] 机器人图片软删除正常工作

### 性能测试  
- [ ] 查询性能无明显下降
- [ ] 索引生效验证
- [ ] 大数据量场景测试

### 数据完整性测试
- [ ] 软删除记录数据完整保留
- [ ] 级联关系正确处理
- [ ] 向量数据同步删除（知识库）
- [ ] 机器人数据迁移正确（is_active → is_deleted）
- [ ] Storage文件保留（图片软删除）

## 后续优化计划

1. **数据清理机制**: 实现定期清理长期软删除数据
2. **恢复功能**: 实现软删除数据的恢复功能
3. **审计日志**: 记录删除操作日志，支持追溯
4. **批量操作**: 支持批量软删除和恢复
5. **机器人字段清理**: 考虑移除冗余的 `is_active` 字段

## 风险评估

### 低风险
- 查询性能影响：通过索引优化已控制
- 存储空间增长：软删除数据量相对较小

### 中等风险  
- 代码复杂度增加：通过良好的错误处理和测试覆盖控制
- 数据一致性：通过事务和回滚机制保证
- 机器人字段迁移：现有数据需要迁移处理

### 注意事项
- 部署前必须先执行数据库迁移脚本
- 机器人模块需要验证数据迁移结果
- 建议在低峰期部署，避免影响用户使用
- 部署后重点关注查询性能和删除功能 