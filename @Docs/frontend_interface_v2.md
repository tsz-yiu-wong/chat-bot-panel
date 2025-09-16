# 前端功能接口需求 (v2.3)

> 目标：定义 v2.3 前端各模块所需的 API 接口，与 API 契约保持一致。
> - **API 版本**: `/api/v2/*`
> - **语言**: 数据库字段 `name_zh`/`name_en`/`name_vi`，API 参数 `language: 'zh'|'en'|'vi'`
> - **响应**: 统一 `ApiSuccess<T>` 或 `ApiFailure`
> - **认证**: 所有请求均需 JWT Token (Supabase Auth)

---

## 1. 角色人设 (Characters)
- **位置**: `src/app/characters/page.tsx`
- **核心功能**:
  - 列表加载、选择、创建、编辑、软删除角色。
  - 角色图片管理。
  - 人设向量检索测试。
- **接口需求**:
  - `GET /api/v2/characters`: 加载角色列表。
  - `POST /api/v2/characters`: 创建新角色。
    - 请求: `{ name, age, gender, ... }`
  - `PUT /api/v2/characters/{id}`: 保存角色编辑。
    - 请求: `{ ...fields }`
  - `DELETE /api/v2/characters/{id}`: 软删除角色。
  - `GET /api/v2/characters/{id}/images`: 加载指定角色的图片。
  - `POST /api/v2/characters/{id}/images`: 上传新图片 (FormData)。
  - `DELETE /api/v2/characters/{character_id}/images/{image_id}`: 软删除图片。
  - `POST /api/v2/characters/search`: 向量检索测试。
    - 请求: `{ query, language, limit, ... }`
  - `PUT /api/v2/characters/{id}/vectors`: (可选) 手动触发指定角色的向量重建。

---

## 2. 知识库 (Knowledge)
- **位置**: `src/app/knowledge/page.tsx`
- **核心功能**:
  - 统一管理“缩写”与“话术”的增删改查。
  - 统一管理两种类型的分类。
  - 向量检索测试。
- **接口需求**:
  - `GET /api/v2/knowledge/categories?knowledge_type=abbreviation`: 获取缩写分类。
  - `GET /api/v2/knowledge/categories?knowledge_type=script`: 获取话术分类。
  - `POST /api/v2/knowledge/categories`: 创建新分类 (请求体含 `knowledge_type`)。
  - `GET /api/v2/knowledge/items`: 获取知识条目列表 (可按 `knowledge_type` 和 `category_id` 过滤)。
  - `POST /api/v2/knowledge/items`: 创建新条目 (请求体含 `knowledge_type`)。
  - `PUT /api/v2/knowledge/items/{id}`: 更新条目。
  - `DELETE /api/v2/knowledge/items/{id}`: 软删除条目。
  - `POST /api/v2/knowledge/search`: 向量检索测试。
    - 请求: `{ query, knowledge_type, language, limit, ... }`

---

## 3. 系统提示词 (Prompts)
- **位置**: `src/app/prompts/page.tsx`
- **核心功能**: 提示词增删改查、筛选。
- **接口需求**:
  - `GET /api/v2/prompts`: 获取提示词列表。
  - `GET /api/v2/prompts/{id}`: 获取详情。
  - `POST /api/v2/prompts`: 创建新提示词。
  - `PUT /api/v2/prompts/{id}`: 更新提示词。
  - `DELETE /api/v2/prompts/{id}`: 软删除提示词。

---

## 4. 测试聊天 (Test Chat)
- **位置**: `src/app/test-chat/page.tsx`
- **核心功能**:
  - 选择用户、会话、Prompt、角色，发送消息，触发 AI 回复。
  - 触发话题、向量化及检索。
- **数据加载接口**:
  - `GET /api/v2/chat/users`
  - `GET /api/v2/chat/sessions`
  - `GET /api/v2/chat/messages?session_id={id}`
  - `GET /api/v2/prompts`
  - `GET /api/v2/characters`
  - `GET /api/v2/topics`
- **操作接口**:
  - `POST /api/v2/chat/users`
  - `POST /api/v2/chat/sessions`
  - `POST /api/v2/chat/messages` (发送消息)
  - `POST /api/v2/chat/messages/process` (触发 AI 回复)
  - `DELETE /api/v2/chat/users/{id}`
  - `DELETE /api/v2/chat/sessions/{id}`
- **向量与话题接口**:
  - `POST /api/v2/chat/vectors/search`
  - `POST /api/v2/chat/topics/trigger`

---

## 5. 话题库 (Topics)
- **位置**: `src/app/topics/page.tsx`
- **核心功能**: 三级话题树的管理（增删改查、排序）。
- **接口需求**:
  - `GET /api/v2/topics`: 获取完整话题树。
  - `POST /api/v2/topics/categories`: 创建大类。
  - `POST /api/v2/topics/subcategories`: 创建小类。
  - `POST /api/v2/topics/items`: 创建话题项。
  - `PUT /api/v2/topics/categories/{id}`
  - `PUT /api/v2/topics/subcategories/{id}`
  - `PUT /api/v2/topics/items/{id}`
  - `DELETE /api/v2/topics/categories/{id}` (级联软删除)
  - `DELETE /api/v2/topics/subcategories/{id}` (级联软删除)
  - `DELETE /api/v2/topics/items/{id}`
