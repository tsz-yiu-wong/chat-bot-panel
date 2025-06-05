# 聊天机器人管理系统 - 配置指南

## 1. 数据库配置

### 1.1 运行数据库初始化脚本

按照以下顺序在Supabase SQL编辑器中运行脚本：

```sql
-- 1. 首先运行数据库结构创建脚本
-- 文件: database/schema.sql
```

```sql
-- 2. 创建密码验证函数
-- 文件: database/functions.sql  
```

```sql
-- 3. 初始化管理员账号
-- 文件: database/init_admin_users.sql
```

### 1.2 测试账号

系统已预创建以下测试账号：

- **超级管理员**: `superadmin` / `super123456`
- **管理员**: `admin` / `admin123456`  
- **操作员**: `operator` / `operator123`
- **查看者**: `viewer` / `viewer123`

## 2. 环境变量配置

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 可选：如果需要服务端访问
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**获取配置信息:**
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 Settings > API
4. 复制 Project URL 和 anon public key

## 3. 权限系统

### 3.1 角色权限

| 角色 | 权限页面 |
|------|----------|
| viewer | 用户管理 |
| operator | 用户管理, 话题库, 知识库 |
| admin | 所有页面 |
| super_admin | 所有页面 |

### 3.2 登录流程

1. 用户在登录页面输入用户名和密码
2. 系统调用数据库函数验证密码
3. 验证成功后将用户信息保存到localStorage
4. 根据用户角色跳转到对应的默认页面
5. 在各个页面访问时检查权限

### 3.3 访问控制

- 未登录用户会自动跳转到登录页面
- 已登录用户访问无权限页面会跳转到其角色默认页面
- 侧边栏菜单根据用户权限动态显示

## 4. 启动项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 进入登录页面。

## 5. 注意事项

- 确保Supabase项目启用了 `pgcrypto` 扩展
- 密码使用bcrypt加密存储
- localStorage用于客户端会话管理
- 所有页面都有权限检查保护 