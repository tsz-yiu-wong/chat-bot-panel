# 数据模型与权限矩阵 v2

> 目标：基于最新的数据库 Schema，定义数据模型、关系与权限策略。

## 一、统一命名与数据约定

- **语言与多语言字段**:
  - 系统支持三种语言, 定义为 `language_type` ENUM: `'en'` (英文), `'zh'` (中文), `'vi'` (越南语)。
  - 需要多语言支持的字段统一采用 `name_en`, `name_zh`, `name_vi` 或 `prompt_en`, `prompt_zh`, `prompt_vi` 的形式。
- **软删除**:
  - 所有核心表都包含 `is_deleted BOOLEAN` 字段，默认为 `FALSE`。
  - RLS 策略确保普通用户无法查询到 `is_deleted = TRUE` 的记录。
- **主键与时间戳**:
  - 主键统一为 `id UUID`，使用 `gen_random_uuid()` 生成。
  - 所有表都包含 `created_at TIMESTAMPTZ` 和 `updated_at TIMESTAMPTZ`。
  - `updated_at` 字段通过 `update_updated_at_column()` 触发器在每次更新时自动刷新。
- **向量化**:
  - 核心内容表（如 `characters`, `knowledge_items`, `chat_messages`）都关联一个向量表。
  - 向量表包含 `embedding vector(1536)` 字段，存储 OpenAI `text-embedding-3-small` 模型生成的向量。

---

## 二、数据模型总览（按模块）

### A. 用户与认证模块 (Auth Module)
- **表结构**:
  - `users`: 存储面板用户公开信息，关联 `auth.users`。
    - **字段**: `id (FK to auth.users), username, role, full_name, updated_at`
    - **`role` 类型**: `user_role` ENUM (`'user'`, `'admin'`, `'super_admin'`)

### B. 聊天对话模块 (Chat Module)
- **表结构**:
  - `chat_users`: 存储跨平台的聊天用户信息。
    - **字段**: `id, uid, platform, platform_username, avatar_url, metadata, is_deleted, created_at, updated_at`
  - `chat_sessions`: 存储聊天会话，关联用户与角色。
    - **字段**: `id, user_id (FK), character_id (FK), session_name, language, message_merge_seconds, topic_trigger_hours, is_topic_enabled, last_message_at, last_processed_at, is_deleted, created_at, updated_at`
  - `chat_messages`: 存储会话中的具体消息。
    - **字段**: `id, session_id (FK), user_id (FK), role, content, metadata, is_processed, merge_group_id, created_at`
    - **`role` 类型**: `chat_message_role_type` ENUM (`'system'`, `'user'`, `'assistant'`)
  - `chat_message_vectors`: 存储聊天消息的向量嵌入。
    - **字段**: `id, session_id (FK), message_id (FK), content, embedding, vector_type, language, created_at`

### C. 话题管理模块 (Topics Module)
- **表结构**:
  - `topic_categories`: 存储顶级话题分类。
    - **字段**: `id, name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
  - `topic_subcategories`: 存储话题子分类。
    - **字段**: `id, category_id (FK), name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
  - `topics`: 存储具体的话题内容。
    - **字段**: `id, category_id (FK), subcategory_id (FK), content, usage_count, language, is_deleted, created_at, updated_at`

### D. 知识库模块 (Knowledge Module)
- **设计**: 采用统一模型管理“缩写” (`abbreviation`) 和“话术” (`script`)。
- **表结构**:
  - `knowledge_categories`: 存储知识库的统一分类。
    - **字段**: `id, knowledge_type, name_zh, name_en, name_vi, is_deleted, created_at, updated_at`
    - **`knowledge_type`**: `knowledge_type` ENUM (`'abbreviation'`, `'script'`)
  - `knowledge_items`: 存储统一的知识条目。
    - **字段**: `id, knowledge_type, category_id (FK), language, abbreviation, full_form, description, user_text, answer_text, is_deleted, created_at, updated_at`
    - **约束**: `CHECK` 约束确保 `knowledge_type` 对应的字段非空。
  - `knowledge_vectors`: 存储知识条目的向量嵌入。
    - **字段**: `id, item_id (FK), vector_type, content, language, embedding, metadata, search_weight, is_deleted, created_at, updated_at`

### E. 提示词模块 (Prompts Module)
- **表结构**:
  - `prompts`: 存储用于 AI 模型的系统提示词。
    - **字段**: `id, name, model_name, stage_name, prompt_zh, prompt_en, prompt_vi, mark, is_deleted, created_at, updated_at`

### F. 角色人设模块 (Characters Module)
- **设计**: 替代旧的 `bot_personalities`，提供更丰富的角色定义。
- **表结构**:
  - `characters`: 存储角色的详细资料。
    - **字段**: `id, language, name, age, gender, nationality, job_title, height_cm, weight_kg, blood_type, zodiac, birth_date, birth_place, current_address, work_address, daily_routine, favourite, family_member, worldview, life_philosophy, personal_values, future_plan, wish_place, life_dream, education_exp, work_exp, life_event, marital_status, relationship_exp, is_deleted, created_at, updated_at`
  - `character_images`: 存储与角色关联的图片。
    - **字段**: `id, character_id (FK), image_url, title, description, is_deleted, created_at, updated_at`
  - `character_vectors`: 存储角色资料不同维度的向量嵌入。
    - **字段**: `id, character_id (FK), facet, content, language, embedding, is_deleted, created_at, updated_at`

---

## 三、实体关系 (Entity Relationships)
- `auth.users` 1—1 `public.users`
- `chat_users` 1—N `chat_sessions`
- `characters` 1—N `chat_sessions`
- `chat_sessions` 1—N `chat_messages`
- `chat_messages` 1—1 `chat_message_vectors` (UNIQUE ON `message_id`)
- `topic_categories` 1—N `topic_subcategories` 1—N `topics`
- `knowledge_categories` 1—N `knowledge_items`
- `knowledge_items` 1—1 `knowledge_vectors` (UNIQUE ON `item_id`)
- `characters` 1—N `character_images`
- `characters` 1—N `character_vectors` (UNIQUE ON `character_id`, `facet`)

---

## 四、权限与访问策略 (RLS)

系统采用 Supabase Auth (JWT) 结合 PostgreSQL 的行级安全 (RLS) 策略进行权限控制。

- **核心函数**: `public.get_my_role()` 用于获取当前认证用户的角色 (`user`, `admin`, `super_admin`)。

- **通用策略** (适用于 `topics`, `knowledge`, `prompts`, `characters` 等模块):
  - `SELECT`:
    - `admin` / `super_admin` 角色可以查看所有记录，包括已软删除的 (`is_deleted = true`)。
    - 普通 `user` 角色只能查看未被软删除的记录 (`is_deleted = false`)。
  - `INSERT` / `UPDATE`:
    - 仅 `admin` / `super_admin` 角色可以创建和修改记录。
  - `DELETE`:
    - 禁止物理删除记录。所有删除操作均为软删除（更新 `is_deleted` 标志）。

- **特定策略**:
  - `chat_messages` / `chat_message_vectors`: 所有认证用户均可 `SELECT`。`INSERT` 和 `UPDATE` 仅限 `admin` / `super_admin`。
  - `users`: 所有用户均可 `SELECT` 查看其他用户资料。用户只能 `UPDATE` 自己的资料。`INSERT` 由触发器自动处理，禁止手动插入。

---

## 五、触发器与自动化

- **新用户自动创建 Profile**:
  - 当一个新用户在 `auth.users` 中注册后，`on_auth_user_created` 触发器会自动调用 `handle_new_user()` 函数，在 `public.users` 表中为其创建一条关联记录。

- **`updated_at` 自动更新**:
  - 所有表都配置了 `trigger_update_*_updated_at` 触发器，在 `BEFORE UPDATE` 事件上调用 `update_updated_at_column()` 函数，自动更新 `updated_at` 时间戳。

- **软删除同步**:
  - 当主表记录被软删除时（`is_deleted` 更新为 `TRUE`），`synchronize_vector_soft_delete()` 函数会被触发，将关联的向量表中的对应记录也标记为软删除。
  - **应用范围**: `characters` -> `character_vectors`, `knowledge_items` -> `knowledge_vectors`。

- **自动向量化**:
  - 当核心内容被创建或更新时，`trigger_vectorization_request()` 函数会被触发，通过 `pg_net` 异步调用一个 Edge Function (`vectorize-on-change`) 来处理内容的向量化和存储。
  - **应用范围**: `characters`, `knowledge_items`, `chat_messages`。
