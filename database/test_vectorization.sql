-- 测试向量化触发器
-- 这个脚本用于验证向量化触发器是否正常工作

-- 1. 检查触发器是否存在
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trigger_create_chat_message_vectors',
    'trigger_update_chat_message_vectors'
)
ORDER BY trigger_name;

-- 2. 检查触发器函数是否存在
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'create_chat_message_vectors',
    'update_chat_message_vectors'
);

-- 3. 查看最近的AI消息和对应的向量记录
SELECT 
    'AI Messages' as type,
    cm.id as message_id,
    cm.content,
    cm.created_at,
    cmv.id as vector_id,
    cmv.vector_type,
    CASE WHEN cmv.embedding IS NULL THEN 'NO' ELSE 'YES' END as has_embedding
FROM chat_messages cm
LEFT JOIN chat_message_vectors cmv ON cm.id = cmv.message_id
WHERE cm.role = 'assistant'
ORDER BY cm.created_at DESC
LIMIT 10;

-- 4. 统计向量化覆盖率
SELECT 
    'AI Messages Coverage' as metric,
    COUNT(cm.id) as total_ai_messages,
    COUNT(cmv.id) as vectorized_messages,
    ROUND(COUNT(cmv.id)::decimal / NULLIF(COUNT(cm.id), 0) * 100, 2) as coverage_percent
FROM chat_messages cm
LEFT JOIN chat_message_vectors cmv ON cm.id = cmv.message_id
WHERE cm.role = 'assistant';

-- 5. 检查向量类型分布
SELECT 
    vector_type,
    COUNT(*) as count,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as without_embedding
FROM chat_message_vectors
GROUP BY vector_type
ORDER BY count DESC; 