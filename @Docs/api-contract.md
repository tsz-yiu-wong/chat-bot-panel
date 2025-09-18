# API 契约

> **目标**: 本文档为前后端及外部服务间的交互定义了统一的接口规范。

## 1. 全局约定

### 1.1. 版本管理
`(TODO)`: 当前所有 API 均未版本化。未来若有重大变更，建议采用路径版本控制，如 `/api/v2/...`。

### 1.2. 响应结构
`(TODO)`: 建议统一所有 API 的 JSON 响应结构。
- **成功响应示例**:
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```
- **失败响应示例**:
  ```json
  {
    "status": "error",
    "error": {
      "code": "AUTH_INVALID_CREDENTIALS",
      "message": "Invalid username or password."
    }
  }
  ```

### 1.3. 错误码
`(TODO)`: 建议建立全局统一的错误码体系。
- `AUTH_*`: 认证相关错误
- `PERM_*`: 权限相关错误
- `VALIDATION_*`: 输入验证错误
- `SERVER_*`: 服务器内部错误

### 1.4. 鉴权 (Authentication)
- 所有需要用户身份认证的 Next.js API 端点都通过 Supabase Auth 进行 JWT 验证。请求头需包含 `Authorization: Bearer <SUPABASE_JWT>`。
- Python 核心引擎的 API 端点也应设计安全机制，如 API Key 或 JWT 验证。

### 1.5. 语言 (Localization)
- 支持多语言内容的实体，可以通过查询参数或请求体指定语言版本，如 `?lang=zh`。

### 1.6. 软删除 (Soft Deletes)
- API 层面不提供物理删除接口。对于支持软删除的资源，应使用 `DELETE` 方法来更新其 `is_deleted` 标志，而非真正删除记录。

---

## 2. 模块接口 (按资源)

### 2.1. 核心聊天引擎 API (Python)

#### `POST /api/chat/process`
- **职责**: 接收外部脚本的请求，同步处理并返回 LLM 的聊天结果。
- **请求体**:
  ```json
  {
    "user_id": "string",
    "character_id": "uuid",
    "session_id": "uuid",
    "message": "string"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "reply_text": "string"
  }
  ```
- **失败响应**:
  - `400 Bad Request`: 输入参数验证失败。
  - `500 Internal Server Error`: 处理过程中发生未知错误。

---

### 2.2. 管理面板 API (Next.js)

#### 认证模块 (`Auth`)

##### `POST /api/auth/login`
- **职责**: 处理后台用户的登录请求。
- **请求体**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **成功响应 (200 OK)**:
  - 返回 Supabase 的 `AuthResponse`，其中包含 `session` 和 `user` 对象。
- **失败响应 (401 Unauthorized)**:
  - 为了安全，无论是用户名错误还是密码错误，都返回统一的 "Invalid username or password" 错误信息。

#### 用户管理模块 (`Admin`)

##### `POST /api/admin/create-user`
- **职责**: (高权限) 允许管理员创建新用户。
- **权限**: `admin` / `super_admin` (当前 TODO: 接口缺少权限校验)
- **请求体**:
  ```json
  {
    "email": "string",
    "password": "string",
    "username": "string",
    "role": "user" | "admin" | "super_admin"
  }
  ```
- **成功响应 (201 Created)**:
  ```json
  {
    "message": "User created successfully",
    "userId": "uuid"
  }
  ```
- **失败响应**:
  - `400 Bad Request`: 输入参数不合法（如邮箱格式错误、用户已存在）。
  - `403 Forbidden`: 调用者无权执行此操作。
  - `500 Internal Server Error`: 创建用户过程中发生错误。

---

## 3. 示例与错误语义

`(TODO)`: 此处应为每个端点提供详细的 `curl` 或代码示例，并解释不同错误码的具体触发场景。

---

## 4. 页面 → 接口映射表

`(TODO)`: 此表格旨在快速定位前端页面功能与后端 API 的对应关系。

| 页面 / 功能 | 对应 Server Action / API 端点 | 备注 |
| :--- | :--- | :--- |
| **登录页** | `POST /api/auth/login` |  |
| **用户管理** / 创建用户 | `createUser` (Server Action) 或 `POST /api/admin/create-user` |  |
| **角色管理** / 列表 | `getCharacters` (Server Component DB Call) | SSR, 无 API |
| **角色管理** / 更新角色 | `updateCharacter` (Server Action) |  |
