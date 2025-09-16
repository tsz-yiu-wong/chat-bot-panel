# 数据模型与权限矩阵 (v2.3)

> 目标：基于最新的数据库 Schema，定义 v2.3 的数据模型、关系与权限策略。

## 一、统一命名与数据约定
- **表与版本**：所有表统一使用 `_v2` 后缀。
- **语言与双语字段**：
  - 支持 `zh` (中文), `en` (英文), `vi` (越南语)。语言代码枚举为 `language_type`。
  - 多语言字段统一采用 `name_zh`, `name_en`, `name_vi` 的形式。
- **软删除**：统一使用 `is_deleted boolean` 字段，所有读操作默认过滤 `is_deleted = false`。
- **主键与时间戳**：主键统一为 `id uuid`，时间戳为 `created_at` 和 `updated_at` (timestamptz)，并自动更新 `updated_at`。
- **多语言向量**：向量表包含 `language` 字段，以支持按语言进行检索和过滤。

---

## 二、数据模型总览（按模块）

### A. 聊天对话模块 (Chat Module)
- **表结构**:
  - `chat_users_v2`: 存储跨平台的用户信息。
    - 字段: `id, uid, platform, platform_username, avatar_url, metadata, is_deleted, created_at, updated_at`
  - `chat_sessions_v2`: 存储聊天会话，关联用户与角色。
    - 字段: `id, user_id, character_id, session_name, language, message_merge_seconds, topic_trigger_hours, is_topic_enabled, last_message_at, last_processed_at, is_deleted, created_at, updated_at`
  - `chat_messages_v2`: 存储会话中的具体消息。
    - 字段: `id, session_id, user_id, role, content, metadata, is_processed, merge_group_id, created_at`
    - `role` 类型: `chat_message_role_type` ENUM ('user', 'assistant', 'system', 'topic')
  - `chat_message_vectors_v2`: 存储聊天消息的向量嵌入。
    - 字段: `id, session_id, message_id, content, embedding, vector_type, language, created_at`

### B. 话题管理模块 (Topics Module)
- **表结构**:
  - `topic_categories_v2`: 存储顶级话题分类。
    - 字段: `id, name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
  - `topic_subcategories_v2`: 存储话题子分类。
    - 字段: `id, category_id, name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
  - `topics_v2`: 存储具体的话题内容。
    - 字段: `id, category_id, subcategory_id, content, usage_count, language, is_deleted, created_at, updated_at`

### C. 知识库模块 (Knowledge Module)
- **设计**: 采用统一模型管理“缩写” (abbreviation) 和“话术” (script)。
- **表结构**:
  - `knowledge_categories_v2`: 存储知识库的统一分类。
    - 字段: `id, knowledge_type, name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
    - `knowledge_type`: `knowledge_type` ENUM ('abbreviation', 'script')
  - `knowledge_items_v2`: 存储统一的知识条目（缩写或话术）。
    - 字段: `id, knowledge_type, category_id, abbreviation, full_form, description, user_text, answer_text, is_deleted, created_at, updated_at`
    - 约束: `CHECK` 确保 `knowledge_type` 对应的字段非空。
  - `knowledge_vectors_v2`: 存储知识条目的向量嵌入。
    - 字段: `id, item_id, vector_type, content, language, embedding, metadata, search_weight, is_deleted, created_at, updated_at`

### D. 提示词模块 (Prompts Module)
- **表结构**:
  - `prompts_v2`: 存储用于 AI 模型的系统提示词。
    - 字段: `id, name, model_name, stage_name, prompt_zh, prompt_en, prompt_vi, mark, is_deleted, created_at, updated_at`

### E. 角色人设模块 (Characters Module)
- **设计**: 替代旧的 `bot_personalities`，提供更丰富的角色定义。
- **表结构**:
  - `characters_v2`: 存储角色的详细资料。
    - 核心信息: `id, name, age, gender, nationality, job_title`
    - 个人信息: `height_cm, weight_kg, blood_type, zodiac, birth_date, birth_place`
    - 生活信息: `current_address, work_address, daily_routine, favourite, family_member` (JSONB)
    - 世界观: `worldview, life_philosophy, personal_values`
    - 梦想: `future_plan, wish_place, life_dream`
    - 经历: `education_level, education_exp, work_exp, life_event` (JSONB)
    - 关系: `marital_status, relationship_exp` (JSONB)
    - 标准字段: `is_deleted, created_at, updated_at`
  - `character_images_v2`: 存储与角色关联的图片。
    - 字段: `id, character_id, image_url, title, description, is_deleted, created_at, updated_at`
  - `character_vectors_v2`: 存储角色资料不同维度的向量嵌入。
    - 字段: `id, character_id, facet, content, language, embedding, is_deleted, created_at, updated_at`

---

## 三、实体关系 (Entity Relationships)
- `chat_users_v2` 1—N `chat_sessions_v2`
- `characters_v2` 1—N `chat_sessions_v2`
- `chat_sessions_v2` 1—N `chat_messages_v2`
- `chat_messages_v2` 1—1 `chat_message_vectors_v2` (per content/language)
- `topic_categories_v2` 1—N `topic_subcategories_v2` 1—N `topics_v2`
- `knowledge_categories_v2` 1—N `knowledge_items_v2`
- `knowledge_items_v2` 1—N `knowledge_vectors_v2`
- `characters_v2` 1—N `character_images_v2`
- `characters_v2` 1—N `character_vectors_v2`

---

## 四、权限与访问策略
- **认证核心**: Supabase Auth (JWT) + Row-Level Security (RLS)。
- **API 访问**: 所有 API 请求都需要有效的 JWT token。
- **数据隔离**: RLS 策略基于用户角色 (`role`) 和用户ID (`uid()`) 控制对数据的增删改查权限。
- **前端实现**: 前端统一通过 API Client 访问数据，不直连数据库。`useAuth()` hook 结合 Supabase listener 管理会话状态和用户权限。
- **权限矩阵 (建议)**:
  - `viewer`: 只读访问部分数据，如用户列表。
  - `operator`: 可管理核心业务数据，如 `topics`, `knowledge`, `test-chat`。
  - `admin`: 完全权限，可管理 `characters`, `prompts`, `settings` 等。

---

## 五、触发器与自动化
- **软删除同步**:
  - `characters_v2` 更新 `is_deleted` -> 同步更新 `character_vectors_v2` 的 `is_deleted`。
  - `knowledge_items_v2` 更新 `is_deleted` -> 同步更新 `knowledge_vectors_v2` 的 `is_deleted`。
- **向量化**:
  - `knowledge_items_v2` 创建/更新 -> 触发对应内容的向量化。
  - `characters_v2` 创建/更新 -> 触发对角色资料各维度的向量化。
  - 聊天消息由后台服务异步处理并生成向量。
