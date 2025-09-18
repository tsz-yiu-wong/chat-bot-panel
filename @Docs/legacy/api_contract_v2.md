# API 接口设计 (v2.3)

> 目标：定义 v2.3 的 API 接口，确保与数据模型一致，并提供清晰、统一的接口规范。

## 全局约定
- **版本化**: 所有接口路径统一为 `/api/v2/*`。
- **统一响应结构**:
  - 成功: `{ success: true, data: T, meta?: { pagination?: PaginationMeta } }`
  - 失败: `{ success: false, error: { code: string, message: string, details?: any } }`
  - `PaginationMeta`: `{ page, limit, total, hasMore }`
- **错误码**: 命名规范为 `{MODULE}_{OPERATION}_{REASON}` (例如, `CHAT_CREATE_INVALID_USER`)。
- **鉴权**: 所有 API 均需通过 Supabase Auth (JWT) 进行认证，并通过 RLS 控制数据访问权限。
- **软删除**: `DELETE` 请求将触发 `is_deleted = true` 的更新操作。
- **语言参数**: 多语言内容通过 `language` 参数控制，值为 `'zh' | 'en' | 'vi'`。

---

## 模块契约

### 1. 聊天 (Chat)
- **资源路径**: `/api/v2/chat/*`

- **Users**: `/users`
  - `GET /users`: 获取用户列表。
  - `GET /users/{id}`: 获取用户详情。
  - `POST /users`: 创建新用户。
  - `PUT /users/{id}`: 更新用户信息。
  - `DELETE /users/{id}`: 软删除用户。

- **Sessions**: `/sessions`
  - `GET /sessions`: 获取会话列表 (可按 `user_id` 过滤)。
  - `POST /sessions`: 创建新会话，请求体 `{ user_id, character_id, session_name, ... }`。
  - `PUT /sessions/{id}`: 更新会话设置。
  - `DELETE /sessions/{id}`: 软删除会话。

- **Messages**: `/messages`
  - `GET /messages`: 获取指定会话的消息历史 (`?session_id={id}` a must)。
  - `POST /messages`: 发送用户消息 (入队处理)。
  - `POST /messages/process`: (内部/服务端) 触发 AI 回复生成。

- **Vectors**: `/vectors`
  - `POST /vectors/search`: 在指定会话内进行语义搜索。
  - `POST /vectors/batch-embed`: (内部/服务端) 批量为消息生成向量。

- **Topics Trigger**: `/topics/trigger`
  - `POST /topics/trigger`: 为指定会话触发一个随机话题。

### 2. 话题管理 (Topics)
- **资源路径**: `/api/v2/topics/*`

- **Categories, Subcategories, Items**:
  - `GET /`: 获取完整的话题树结构。
  - `POST /categories`, `POST /subcategories`, `POST /items`: 创建对应层级的条目。
    - 请求体: `{ name_zh, name_en, name_vi }` 或 `{ content, language, ... }`
  - `PUT /categories/{id}`, `PUT /subcategories/{id}`, `PUT /items/{id}`: 更新条目。
  - `DELETE /categories/{id}`, `DELETE /subcategories/{id}`, `DELETE /items/{id}`: 软删除条目 (支持级联)。

### 3. 知识库 (Knowledge)
- **资源路径**: `/api/v2/knowledge/*`
- **设计**: 统一接口管理 `abbreviation` 和 `script` 两种类型。

- **Categories**: `/categories`
  - `GET /categories`: 获取知识库分类 (可按 `knowledge_type` 过滤)。
  - `POST /categories`: 创建新分类 `{ knowledge_type, name_zh, name_en, name_vi }`。
  - `PUT /categories/{id}`, `DELETE /categories/{id}`: 更新或软删除分类。

- **Items**: `/items`
  - `GET /items`: 获取知识条目列表 (必须提供 `knowledge_type` 过滤, 可选 `category_id` 过滤)。
  - `GET /items/{id}`: 获取单个条目详情。
  - `POST /items`: 创建新条目，请求体包含 `knowledge_type` 及对应字段 (`abbreviation`, `full_form` 或 `user_text`, `answer_text`)。
  - `PUT /items/{id}`: 更新条目。
  - `DELETE /items/{id}`: 软删除条目。

- **Search & Vectors**:
  - `POST /search`: 统一的知识库向量搜索入口。
    - 请求: `{ query, knowledge_type, language, limit, ... }`
  - `PUT /vectors`: (内部/服务端) 为指定知识条目重新生成向量。

### 4. 提示词 (Prompts)
- **资源路径**: `/api/v2/prompts`

- **CRUD**:
  - `GET /`: 获取提示词列表。
  - `GET /{id}`: 获取提示词详情。
  - `POST /`: 创建新提示词。
  - `PUT /{id}`: 更新提示词。
  - `DELETE /{id}`: 软删除提示词。

### 5. 角色人设 (Characters)
- **资源路径**: `/api/v2/characters/*`

- **Characters**: `/`
  - `GET /`: 获取所有角色列表。
  - `GET /{id}`: 获取单个角色完整信息。
  - `POST /`: 创建新角色，请求体为 `characters_v2` 表的字段子集。
  - `PUT /{id}`: 更新角色信息。
  - `DELETE /{id}`: 软删除角色 (关联的图片和向量也会被标记为删除)。

- **Images**: `/{character_id}/images`
  - `GET /`: 获取指定角色的图片列表。
  - `POST /`: 上传新图片 (multipart/form-data)。
  - `PUT /images/{image_id}`: 更新图片信息 (如 title, description)。
  - `DELETE /images/{image_id}`: 软删除图片。

- **Vectors**: `/{character_id}/vectors`
  - `PUT /`: (内部/服务端) 为指定角色重新生成所有维度的向量。
  - `POST /search`: 在所有或指定角色人设中进行语义搜索。
    - 请求: `{ query, language, limit, ... }`

---

## 示例类型与错误码
```ts
// 错误码规范：{MODULE}_{OPERATION}_{REASON}
export type ApiErrorCode =
  | 'CHAT_SESSION_NOT_FOUND'
  | 'KNOWLEDGE_INVALID_TYPE'
  | 'CHARACTER_NOT_FOUND'
  | 'VECTOR_EMBEDDING_FAILED'
  | 'AUTH_PERMISSION_DENIED'
  | 'GENERAL_INVALID_INPUT';

// 通用响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: ApiErrorCode; message: string; details?: any };
  meta?: { pagination?: PaginationMeta };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
```
