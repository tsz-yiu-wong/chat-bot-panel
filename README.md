# 聊天机器人管理系统

一个强大的聊天机器人后台管理系统，支持多个机器人、用户标签、多阶段提示词，并集成了 RAG 功能来增强响应质量。

## 功能特性

### 🤖 机器人管理
- 创建和管理不同人格的机器人
- 每个机器人可以有独特的系统提示词和行为模式
- 实时查看机器人统计数据和活跃状态

### 👥 用户管理
- 用户标签系统，支持个性化交互
- 用户活跃度追踪
- 用户聊天历史统计

### 💬 提示词管理
- 基于聊天阶段的提示词配置（问候、澄清、问题解决、告别等）
- 提示词可关联特定机器人和用户标签
- 支持模板变量和条件匹配

### 📊 仪表板
- 系统概览和实时统计
- 最近活动跟踪
- 快速操作入口

### 🔍 RAG 功能
- 聊天历史向量化存储
- 相似对话检索
- 增强上下文理解

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL + pgvector)
- **部署**: Vercel
- **UI组件**: Lucide Icons, Radix UI
- **向量搜索**: pgvector 扩展
- **UI Components**: 自定义组件库 (基于 Tailwind CSS)
- **Icons**: Lucide React

## UI 组件库

项目已重构为使用可复用的UI组件，提高代码的可维护性和一致性。

### 核心组件

#### 表单组件
- `Button` - 通用按钮组件，支持多种样式变体
- `Input` - 输入框组件，支持标签和错误提示
- `Textarea` - 文本域组件
- `Select` - 选择框组件
- `Form` - 表单容器组件

#### 模态框组件
- `Modal` - 通用模态框组件
- `ConfirmModal` - 确认对话框组件

#### 布局组件
- `PageHeader` - 页面头部组件
- `SearchBox` - 搜索框组件
- `FilterTabs` - 筛选标签组件

#### 反馈组件
- `LoadingSpinner` - 加载动画组件
- `PageLoading` - 页面级加载组件

### 使用示例

```typescript
import { Button, Modal, Form, Input } from '@/components/ui'

// 按钮使用
<Button variant="primary" size="md" onClick={handleClick}>
  保存
</Button>

// 模态框使用
<Modal isOpen={showModal} onClose={handleClose} title="编辑">
  <Form onSubmit={handleSubmit}>
    <Input label="名称" required />
    <Button type="submit">保存</Button>
  </Form>
</Modal>
```

## 重构优势

1. **代码复用**: 减少重复代码，提高开发效率
2. **一致性**: 统一的UI风格和交互体验
3. **可维护性**: 组件化架构便于维护和更新
4. **类型安全**: 完整的TypeScript类型支持
5. **响应式**: 支持深色模式和响应式设计

## 开发

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 构建

```bash
npm run build
```

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 支持

如有问题，请提交 Issue 或联系维护团队。
