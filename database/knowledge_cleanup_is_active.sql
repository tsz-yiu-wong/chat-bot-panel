-- 清理知识库表中的 is_active 字段
-- 确认前端代码已统一使用 is_deleted 字段后执行

-- ===== 删除相关索引 =====
DROP INDEX IF EXISTS knowledge_abbreviations_priority_idx;
DROP INDEX IF EXISTS knowledge_abbreviations_active_idx;
DROP INDEX IF EXISTS knowledge_scripts_priority_idx;
DROP INDEX IF EXISTS knowledge_scripts_active_idx;

-- ===== 删除字段 =====
ALTER TABLE knowledge_abbreviations DROP COLUMN IF EXISTS is_active;
ALTER TABLE knowledge_scripts DROP COLUMN IF EXISTS is_active;

-- ===== 重新创建优化后的索引（不包含 is_active） =====
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_priority_idx ON knowledge_abbreviations (priority DESC);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_deleted_idx ON knowledge_abbreviations (is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS knowledge_scripts_priority_idx ON knowledge_scripts (priority DESC);
CREATE INDEX IF NOT EXISTS knowledge_scripts_deleted_idx ON knowledge_scripts (is_deleted) WHERE is_deleted = FALSE;

-- ===== 验证清理结果 =====
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('knowledge_abbreviations', 'knowledge_scripts')
    AND column_name = 'is_active'
ORDER BY table_name, column_name;

-- 如果返回空结果，说明 is_active 字段已成功删除 