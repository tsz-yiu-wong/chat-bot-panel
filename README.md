# 多角色聊天机器人

**⚠️ 重要：由于外键约束，必须按以下顺序执行：**

```bash
00_extensions.sql
00_helpers.sql
02_topics_schema.sql
03_knowledge_schema.sql
04_prompts_schema.sql    # 必须先创建 prompt_stages 表
05_characters_schema.sql # 必须先创建 characters 表
01_chat_schema.sql       # 最后创建，因为依赖 prompt_stages 和 characters
06_vectorization_triggers.sql
07_auth_rls.sql
```

**说明：**
- `01_chat_schema.sql` 中的 `chat_users` 表直接引用了 `characters(id)` 和 `prompt_stages(id)`
- 因此必须先创建这两个表，再创建 `chat_users` 表
