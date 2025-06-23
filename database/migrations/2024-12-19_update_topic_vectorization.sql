-- ===== 话题向量化策略更新 =====
-- 更新日期: 2024-12-19
-- 功能: 支持话题场景的向量化，只向量化完整的 topic | user | assistant 对话

-- 重新创建向量化处理函数
CREATE OR REPLACE FUNCTION create_chat_message_vectors()
RETURNS TRIGGER AS $$
DECLARE
    content_text TEXT;
    user_content TEXT := '';
    topic_content TEXT := '';
    merge_group_id_val UUID;
    topic_message RECORD;
BEGIN
    -- 只为AI回复创建向量
    IF NEW.role = 'assistant' THEN
        -- 获取AI回复的merge_group_id
        merge_group_id_val := NEW.merge_group_id;
        
        -- 如果有merge_group_id，获取该组的用户消息（正确的配对）
        IF merge_group_id_val IS NOT NULL THEN
            SELECT string_agg(content, ' ' ORDER BY created_at) INTO user_content
            FROM chat_messages 
            WHERE merge_group_id = merge_group_id_val 
            AND role = 'user' 
            AND is_processed = TRUE;
        END IF;
        
        -- 查找对应的话题消息（在用户消息之前的最近一条topic消息）
        SELECT content INTO topic_content
        FROM chat_messages 
        WHERE session_id = NEW.session_id 
        AND role = 'topic'
        AND created_at < (
            SELECT MIN(created_at) 
            FROM chat_messages 
            WHERE merge_group_id = merge_group_id_val 
            AND role = 'user'
        )
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- 根据是否有话题和用户消息，创建不同格式的向量
        IF topic_content IS NOT NULL AND user_content IS NOT NULL AND user_content != '' THEN
            -- 完整的话题对话：topic | user | assistant
            content_text := format('topic: %s | user: %s | assistant: %s', 
                topic_content,
                user_content,
                NEW.content
            );
            
            INSERT INTO chat_message_vectors (
                session_id,
                message_id,
                content,
                vector_type,
                embedding
            ) VALUES (
                NEW.session_id,
                NEW.id,
                content_text,
                'topic_qa',  -- 话题问答对
                NULL
            );
        ELSIF user_content IS NOT NULL AND user_content != '' THEN
            -- 传统的用户对话：user | assistant
            content_text := format('user: %s | assistant: %s', 
                user_content,
                NEW.content
            );
            
            INSERT INTO chat_message_vectors (
                session_id,
                message_id,
                content,
                vector_type,
                embedding
            ) VALUES (
                NEW.session_id,
                NEW.id,
                content_text,
                'qa',  -- 普通问答对
                NULL
            );
        ELSE
            -- 没有找到对应的用户消息，跳过向量创建
            RAISE NOTICE '警告: AI回复消息 % 没有找到对应的用户消息，跳过向量创建', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新创建批量向量化函数
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
    content_text TEXT;
BEGIN
    -- 统计需要处理的AI消息数量（只处理AI回复）
    SELECT COUNT(*) INTO total
    FROM chat_messages cm
    WHERE (p_session_id IS NULL OR cm.session_id = p_session_id)
    AND cm.role = 'assistant'
    AND NOT EXISTS (
        SELECT 1 FROM chat_message_vectors cv 
        WHERE cv.message_id = cm.id
    );

    -- 只处理AI回复消息
    FOR message_record IN
        SELECT cm.id, cm.session_id, cm.role, cm.content, cm.merge_group_id
        FROM chat_messages cm
        WHERE (p_session_id IS NULL OR cm.session_id = p_session_id)
        AND cm.role = 'assistant'
        AND NOT EXISTS (
            SELECT 1 FROM chat_message_vectors cv 
            WHERE cv.message_id = cm.id
        )
        ORDER BY cm.created_at DESC
        LIMIT p_limit
    LOOP
        user_content := '';
        topic_content := '';
        
        -- 获取该AI回复对应的用户消息（通过merge_group_id）
        IF message_record.merge_group_id IS NOT NULL THEN
            SELECT string_agg(content, ' ' ORDER BY created_at) INTO user_content
            FROM chat_messages 
            WHERE merge_group_id = message_record.merge_group_id 
            AND role = 'user' 
            AND is_processed = TRUE;
            
            -- 查找对应的话题消息（在用户消息之前的最近一条topic消息）
            SELECT content INTO topic_content
            FROM chat_messages 
            WHERE session_id = message_record.session_id 
            AND role = 'topic'
            AND created_at < (
                SELECT MIN(created_at) 
                FROM chat_messages 
                WHERE merge_group_id = message_record.merge_group_id 
                AND role = 'user'
            )
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;
        
        -- 根据是否有话题和用户消息，创建不同格式的向量
        IF topic_content IS NOT NULL AND user_content IS NOT NULL AND user_content != '' THEN
            -- 完整的话题对话：topic | user | assistant
            content_text := format('topic: %s | user: %s | assistant: %s', 
                topic_content,
                user_content,
                message_record.content
            );
            
            INSERT INTO chat_message_vectors (
                session_id,
                message_id,
                content,
                vector_type,
                embedding
            ) VALUES (
                message_record.session_id,
                message_record.id,
                content_text,
                'topic_qa',  -- 话题问答对
                NULL
            );
            
            processed := processed + 1;
        ELSIF user_content IS NOT NULL AND user_content != '' THEN
            -- 传统的用户对话：user | assistant
            content_text := format('user: %s | assistant: %s', 
                user_content,
                message_record.content
            );
            
            INSERT INTO chat_message_vectors (
                session_id,
                message_id,
                content,
                vector_type,
                embedding
            ) VALUES (
                message_record.session_id,
                message_record.id,
                content_text,
                'qa',  -- 普通问答对
                NULL
            );
            
            processed := processed + 1;
        ELSE
            RAISE NOTICE '跳过AI回复消息 %: 没有找到对应的用户消息', message_record.id;
        END IF;
    END LOOP;

    RETURN QUERY SELECT processed, total, p_session_id;
END;
$$;

-- 输出更新信息
DO $$
BEGIN
    RAISE NOTICE '✅ 话题向量化策略更新完成';
    RAISE NOTICE '- 支持 topic | user | assistant 完整对话向量化';
    RAISE NOTICE '- 新增 topic_qa 向量类型用于话题问答对';
    RAISE NOTICE '- 避免重复向量化 topic | user 部分';
END $$; 