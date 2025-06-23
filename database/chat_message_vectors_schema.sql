-- Chat Message 向量化数据库Schema
-- 为聊天消息提供向量化存储和检索功能

-- ===== 重命名表格为更符合语义的名称 =====
-- 如果原表存在，先重命名
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_vectors') THEN
        ALTER TABLE chat_vectors RENAME TO chat_message_vectors;
        RAISE NOTICE '已将 chat_vectors 表重命名为 chat_message_vectors';
    END IF;
END $$;

-- 创建新表（如果不存在）
CREATE TABLE IF NOT EXISTS chat_message_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                      -- 用于向量化的文本
    embedding TEXT,                            -- 向量数据 (JSON格式)
    vector_type VARCHAR(50) DEFAULT 'message', -- 向量类型: message, summary, context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加新的索引以提升向量检索性能
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_embedding_search ON chat_message_vectors USING gin(to_tsvector('english', content))
WHERE embedding IS NOT NULL;

-- 创建向量搜索优化的索引
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_session_type ON chat_message_vectors(session_id, vector_type);
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_created_desc ON chat_message_vectors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_message ON chat_message_vectors(message_id);

-- 删除旧索引（如果存在）
DROP INDEX IF EXISTS idx_chat_vectors_embedding_search;
DROP INDEX IF EXISTS idx_chat_vectors_session_type;
DROP INDEX IF EXISTS idx_chat_vectors_created_desc;
DROP INDEX IF EXISTS idx_chat_vectors_session;
DROP INDEX IF EXISTS idx_chat_vectors_message;
DROP INDEX IF EXISTS idx_chat_vectors_type;

-- ===== 聊天消息向量化触发器 =====

-- 创建向量化处理函数
CREATE OR REPLACE FUNCTION create_chat_message_vectors()
RETURNS TRIGGER AS $$
DECLARE
    content_text TEXT;
    user_content TEXT := '';
    topic_content TEXT := '';
    merge_group_id_val UUID;
    topic_created_at TIMESTAMPTZ;
    has_previous_ai_reply BOOLEAN := FALSE;
BEGIN
    -- 只为AI回复创建向量
    IF NEW.role = 'assistant' THEN
        -- 获取AI回复的merge_group_id
        merge_group_id_val := NEW.merge_group_id;
        
        -- 如果有merge_group_id，获取该组的用户消息（正确的配对）
        IF merge_group_id_val IS NOT NULL THEN
            SELECT string_agg(um.content, ' ' ORDER BY um.created_at) INTO user_content
            FROM chat_messages um
            WHERE um.merge_group_id = merge_group_id_val 
            AND um.role = 'user' 
            AND um.is_processed = TRUE;
            
            -- 查找对应的话题消息
            SELECT tm.content, tm.created_at INTO topic_content, topic_created_at
            FROM chat_messages tm
            WHERE tm.session_id = NEW.session_id 
            AND tm.role = 'topic'
            AND tm.created_at < (
                SELECT MIN(um2.created_at) 
                FROM chat_messages um2
                WHERE um2.merge_group_id = merge_group_id_val 
                AND um2.role = 'user'
            )
            ORDER BY tm.created_at DESC
            LIMIT 1;
            
            -- 如果找到了话题消息，检查在该话题后是否已有AI回复
            IF topic_content IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM chat_messages am
                    WHERE am.session_id = NEW.session_id
                    AND am.role = 'assistant'
                    AND am.created_at > topic_created_at
                    AND am.created_at < NEW.created_at
                ) INTO has_previous_ai_reply;
            END IF;
        END IF;
        
        -- 根据情况创建向量：
        -- 1. 有话题 + 用户消息 + 这是对话题的第一次AI回复 → topic_qa
        -- 2. 其他情况 → qa
        IF topic_content IS NOT NULL AND user_content IS NOT NULL AND user_content != '' AND NOT has_previous_ai_reply THEN
            -- 完整的话题对话：topic | user | assistant（仅第一次回复）
            content_text := format('topic: %s | user: %s | assistant: %s', topic_content, user_content, NEW.content);
            INSERT INTO chat_message_vectors (session_id, message_id, content, vector_type) 
            VALUES (NEW.session_id, NEW.id, content_text, 'topic_qa');
        ELSIF user_content IS NOT NULL AND user_content != '' THEN
            -- 传统的用户对话：user | assistant
            content_text := format('user: %s | assistant: %s', user_content, NEW.content);
            INSERT INTO chat_message_vectors (session_id, message_id, content, vector_type) 
            VALUES (NEW.session_id, NEW.id, content_text, 'qa');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（仅在INSERT时触发）
DROP TRIGGER IF EXISTS trigger_create_chat_message_vectors ON chat_messages;
CREATE TRIGGER trigger_create_chat_message_vectors
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_message_vectors();

-- 创建更新触发器（当用户消息被标记为已处理时）
CREATE OR REPLACE FUNCTION update_chat_message_vectors()
RETURNS TRIGGER AS $$
BEGIN
    -- 不再为用户消息单独创建向量
    -- 向量只在AI回复时创建，包含完整的问答对
    -- 这样避免了重复和错误配对
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_message_vectors ON chat_messages;
CREATE TRIGGER trigger_update_chat_message_vectors
    AFTER UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_vectors();

-- ===== 聊天向量管理函数 =====

-- 批量向量化现有聊天消息
CREATE OR REPLACE FUNCTION vectorize_existing_chat_messages(
    p_session_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE(
    processed_count INTEGER,
    total_count INTEGER,
    session_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    message_record RECORD;
    processed INTEGER := 0;
    total INTEGER := 0;
    user_content TEXT;
    topic_content TEXT;
    topic_created_at TIMESTAMPTZ;
    has_previous_ai_reply BOOLEAN;
    content_text TEXT;
BEGIN
    -- 统计需要处理的AI消息数量
    SELECT COUNT(*) INTO total
    FROM chat_messages cm
    WHERE (p_session_id IS NULL OR cm.session_id = p_session_id)
    AND cm.role = 'assistant'
    AND NOT EXISTS (SELECT 1 FROM chat_message_vectors cv WHERE cv.message_id = cm.id);

    -- 只处理AI回复消息
    FOR message_record IN
        SELECT cm.id, cm.session_id, cm.content, cm.merge_group_id, cm.created_at
        FROM chat_messages cm
        WHERE (p_session_id IS NULL OR cm.session_id = p_session_id)
        AND cm.role = 'assistant'
        AND NOT EXISTS (SELECT 1 FROM chat_message_vectors cv WHERE cv.message_id = cm.id)
        ORDER BY cm.created_at DESC
        LIMIT p_limit
    LOOP
        user_content := '';
        topic_content := '';
        topic_created_at := NULL;
        has_previous_ai_reply := FALSE;
        
        IF message_record.merge_group_id IS NOT NULL THEN
            SELECT string_agg(um.content, ' ' ORDER BY um.created_at) INTO user_content
            FROM chat_messages um
            WHERE um.merge_group_id = message_record.merge_group_id AND um.role = 'user' AND um.is_processed = TRUE;
            
            SELECT tm.content, tm.created_at INTO topic_content, topic_created_at
            FROM chat_messages tm
            WHERE tm.session_id = message_record.session_id 
            AND tm.role = 'topic'
            AND tm.created_at < (SELECT MIN(um2.created_at) FROM chat_messages um2 WHERE um2.merge_group_id = message_record.merge_group_id AND um2.role = 'user')
            ORDER BY tm.created_at DESC
            LIMIT 1;
            
            -- 如果找到了话题消息，检查在该话题后是否已有AI回复
            IF topic_content IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM chat_messages am
                    WHERE am.session_id = message_record.session_id
                    AND am.role = 'assistant'
                    AND am.created_at > topic_created_at
                    AND am.created_at < message_record.created_at
                ) INTO has_previous_ai_reply;
            END IF;
        END IF;
        
        IF topic_content IS NOT NULL AND user_content IS NOT NULL AND user_content != '' AND NOT has_previous_ai_reply THEN
            content_text := format('topic: %s | user: %s | assistant: %s', topic_content, user_content, message_record.content);
            INSERT INTO chat_message_vectors (session_id, message_id, content, vector_type) 
            VALUES (message_record.session_id, message_record.id, content_text, 'topic_qa');
            processed := processed + 1;
        ELSIF user_content IS NOT NULL AND user_content != '' THEN
            content_text := format('user: %s | assistant: %s', user_content, message_record.content);
            INSERT INTO chat_message_vectors (session_id, message_id, content, vector_type) 
            VALUES (message_record.session_id, message_record.id, content_text, 'qa');
            processed := processed + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT processed, total, p_session_id;
END;
$$;

-- 清理聊天向量数据
CREATE OR REPLACE FUNCTION cleanup_chat_message_vectors(
    p_days_to_keep INTEGER DEFAULT 30,
    p_session_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM chat_message_vectors 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep
    AND (p_session_id IS NULL OR session_id = p_session_id);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '已删除 % 条旧的聊天向量记录', deleted_count;
    RETURN deleted_count;
END;
$$;

-- 获取会话向量统计
CREATE OR REPLACE FUNCTION get_session_vector_stats(p_session_id UUID)
RETURNS TABLE(
    total_vectors INTEGER,
    message_vectors INTEGER,
    context_vectors INTEGER,
    with_embedding INTEGER,
    without_embedding INTEGER,
    latest_vector_date TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_vectors,
        COUNT(*) FILTER (WHERE vector_type = 'message')::INTEGER as message_vectors,
        COUNT(*) FILTER (WHERE vector_type = 'context')::INTEGER as context_vectors,
        COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INTEGER as with_embedding,
        COUNT(*) FILTER (WHERE embedding IS NULL)::INTEGER as without_embedding,
        MAX(created_at) as latest_vector_date
    FROM chat_message_vectors
    WHERE session_id = p_session_id;
END;
$$;

-- ===== 测试数据和验证 =====

-- 显示当前聊天向量统计
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== 聊天向量统计 ===';
    
    RAISE NOTICE '总向量数: %', (
        SELECT COUNT(*) FROM chat_message_vectors
    );
    
    RAISE NOTICE '按类型分组:';
    FOR rec IN 
        SELECT vector_type, COUNT(*) as count
        FROM chat_message_vectors 
        GROUP BY vector_type 
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % 条', rec.vector_type, rec.count;
    END LOOP;
    
    RAISE NOTICE '有embedding的向量: %', (
        SELECT COUNT(*) FROM chat_message_vectors WHERE embedding IS NOT NULL
    );
    
    RAISE NOTICE '没有embedding的向量: %', (
        SELECT COUNT(*) FROM chat_message_vectors WHERE embedding IS NULL
    );
END
$$;