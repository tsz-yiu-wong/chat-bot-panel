-- 聊天机器人数据库表结构
-- 支持用户管理、会话管理、消息合并处理、向量检索等功能

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 聊天用户表 (终端用户) =====
CREATE TABLE IF NOT EXISTS chat_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,      -- 用户名
    display_name VARCHAR(100),                  -- 显示名称
    avatar_url TEXT,                           -- 头像URL
    metadata JSONB DEFAULT '{}',               -- 用户其他信息
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ===== 用户标签表 =====
CREATE TABLE IF NOT EXISTS chat_user_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_name VARCHAR(50) UNIQUE NOT NULL,       -- 标签名称
    tag_color VARCHAR(20) DEFAULT '#3B82F6',   -- 标签颜色
    description TEXT,                          -- 标签描述
    is_active BOOLEAN DEFAULT TRUE,            -- 是否激活
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 用户标签关联表 =====
CREATE TABLE IF NOT EXISTS chat_user_tag_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES chat_user_tags(id) ON DELETE CASCADE,
    assigned_by VARCHAR(50) DEFAULT 'system',   -- 分配者：system, admin, auto
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tag_id)                    -- 防止重复标签
);

-- ===== 聊天会话表 =====
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
    bot_personality_id UUID REFERENCES bot_personalities(id) ON DELETE SET NULL,
    session_name VARCHAR(200) DEFAULT '新对话',
    
    -- 消息合并设置
    message_merge_seconds INTEGER DEFAULT 300,      -- 消息合并时间间隔(秒) - 默认5分钟
    
    -- 话题推送设置  
    topic_trigger_hours INTEGER DEFAULT 24,         -- 话题触发小时数 - 默认24小时
    is_topic_enabled BOOLEAN DEFAULT TRUE,          -- 是否启用话题推送
    
    -- 时间戳
    last_message_at TIMESTAMPTZ,                   -- 最后消息时间
    last_processed_at TIMESTAMPTZ,                 -- 最后处理时间
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- ===== 聊天消息表 (明文存储) =====
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES chat_users(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'topic')),
    content TEXT NOT NULL,                      -- 明文消息内容
    metadata JSONB DEFAULT '{}',               -- 人设ID、prompt ID、知识库引用等
    is_processed BOOLEAN DEFAULT FALSE,         -- 是否已处理（用于批量处理）
    merge_group_id UUID,                       -- 消息合并组ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 聊天向量表 (向量化存储) =====
CREATE TABLE IF NOT EXISTS chat_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,                      -- 用于向量化的文本
    embedding TEXT,                            -- 向量数据 (JSON格式)
    vector_type VARCHAR(50) DEFAULT 'message', -- 向量类型: message, summary, context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 创建索引以提高查询性能 =====

-- 聊天用户索引
CREATE INDEX IF NOT EXISTS idx_chat_users_username ON chat_users(username);
CREATE INDEX IF NOT EXISTS idx_chat_users_deleted ON chat_users(is_deleted);

-- 用户标签索引
CREATE INDEX IF NOT EXISTS idx_chat_user_tags_name ON chat_user_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_chat_user_tags_active ON chat_user_tags(is_active);

-- 用户标签关联索引
CREATE INDEX IF NOT EXISTS idx_chat_user_tag_relations_user ON chat_user_tag_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_tag_relations_tag ON chat_user_tag_relations(tag_id);

-- 聊天会话索引
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_bot_personality ON chat_sessions(bot_personality_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted ON chat_sessions(is_deleted);

-- 聊天消息索引
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_processed ON chat_messages(is_processed);
CREATE INDEX IF NOT EXISTS idx_chat_messages_merge_group ON chat_messages(merge_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 聊天向量索引
CREATE INDEX IF NOT EXISTS idx_chat_vectors_session ON chat_vectors(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_vectors_message ON chat_vectors(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_vectors_type ON chat_vectors(vector_type);

-- ===== 创建更新时间触发器 =====

-- 更新时间戳触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为聊天用户表创建更新时间触发器
DROP TRIGGER IF EXISTS update_chat_users_updated_at ON chat_users;
CREATE TRIGGER update_chat_users_updated_at 
    BEFORE UPDATE ON chat_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为用户标签表创建更新时间触发器
DROP TRIGGER IF EXISTS update_chat_user_tags_updated_at ON chat_user_tags;
CREATE TRIGGER update_chat_user_tags_updated_at 
    BEFORE UPDATE ON chat_user_tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为聊天会话表创建更新时间触发器
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 创建聊天相关的实用函数 =====

-- 获取会话的未处理消息数量
CREATE OR REPLACE FUNCTION get_pending_message_count(session_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM chat_messages 
    WHERE session_id = session_uuid 
    AND is_processed = FALSE 
    AND role = 'user';
    
    RETURN COALESCE(count_result, 0);
END;
$$;

-- 获取需要处理消息的会话列表
CREATE OR REPLACE FUNCTION get_sessions_needing_processing()
RETURNS TABLE(
    session_id UUID,
    last_message_at TIMESTAMPTZ,
    message_merge_seconds INTEGER,
    pending_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.last_message_at,
        s.message_merge_seconds,
        get_pending_message_count(s.id) as pending_count
    FROM chat_sessions s
    WHERE s.is_deleted = FALSE
    AND s.last_message_at IS NOT NULL
    AND get_pending_message_count(s.id) > 0
    AND EXTRACT(EPOCH FROM (NOW() - s.last_message_at)) >= s.message_merge_seconds;
END;
$$;

-- 获取需要话题推送的会话列表
CREATE OR REPLACE FUNCTION get_sessions_needing_topics()
RETURNS TABLE(
    session_id UUID,
    last_message_at TIMESTAMPTZ,
    topic_trigger_hours INTEGER,
    hours_since_last_message NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.last_message_at,
        s.topic_trigger_hours,
        EXTRACT(EPOCH FROM (NOW() - s.last_message_at)) / 3600 as hours_since_last_message
    FROM chat_sessions s
    WHERE s.is_deleted = FALSE
    AND s.is_topic_enabled = TRUE
    AND s.last_message_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - s.last_message_at)) / 3600 >= s.topic_trigger_hours;
END;
$$;

-- 获取用户的所有标签
CREATE OR REPLACE FUNCTION get_user_tags(user_uuid UUID)
RETURNS TABLE(
    tag_id UUID,
    tag_name VARCHAR(50),
    tag_color VARCHAR(20),
    description TEXT,
    assigned_by VARCHAR(50),
    assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as tag_id,
        t.tag_name,
        t.tag_color,
        t.description,
        r.assigned_by,
        r.assigned_at
    FROM chat_user_tags t
    JOIN chat_user_tag_relations r ON t.id = r.tag_id
    WHERE r.user_id = user_uuid
    AND t.is_active = TRUE
    ORDER BY r.assigned_at DESC;
END;
$$;

-- 给用户添加标签
CREATE OR REPLACE FUNCTION add_user_tag(user_uuid UUID, tag_name_param VARCHAR(50), assigned_by_param VARCHAR(50) DEFAULT 'system')
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    tag_uuid UUID;
BEGIN
    -- 获取或创建标签
    SELECT id INTO tag_uuid 
    FROM chat_user_tags 
    WHERE tag_name = tag_name_param AND is_active = TRUE;
    
    IF tag_uuid IS NULL THEN
        INSERT INTO chat_user_tags (tag_name, description)
        VALUES (tag_name_param, '自动创建的标签')
        RETURNING id INTO tag_uuid;
    END IF;
    
    -- 添加用户标签关联（忽略重复）
    INSERT INTO chat_user_tag_relations (user_id, tag_id, assigned_by)
    VALUES (user_uuid, tag_uuid, assigned_by_param)
    ON CONFLICT (user_id, tag_id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- ===== 初始化数据 =====

-- 插入默认标签
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chat_user_tags LIMIT 1) THEN
        INSERT INTO chat_user_tags (tag_name, tag_color, description) VALUES 
            ('新用户', '#10B981', '刚注册的新用户'),
            ('活跃用户', '#3B82F6', '经常使用聊天机器人的用户'),
            ('VIP用户', '#F59E0B', '高价值用户'),
            ('问题用户', '#EF4444', '需要特别关注的用户'),
            ('测试用户', '#6B7280', '用于测试的用户账号');
            
        RAISE NOTICE '已插入默认用户标签';
    ELSE
        RAISE NOTICE '用户标签表不为空，跳过初始化数据';
    END IF;
END
$$;

-- 插入测试聊天用户（仅在表为空时执行）
DO $$
DECLARE
    test_user_id UUID;
    demo_user_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chat_users LIMIT 1) THEN
        -- 先插入 testuser
        INSERT INTO chat_users (username, display_name, avatar_url, metadata)
        VALUES ('testuser', 'test', NULL, '{"source": "initial_data"}')
        RETURNING id INTO test_user_id;

        -- 再插入 demo_user
        INSERT INTO chat_users (username, display_name, avatar_url, metadata)
        VALUES ('demo_user', 'demo', NULL, '{"source": "initial_data", "role": "demo"}')
        RETURNING id INTO demo_user_id;

        -- 为测试用户添加标签
        PERFORM add_user_tag(test_user_id, '测试用户', 'system');
        PERFORM add_user_tag(test_user_id, '新用户', 'system');
        PERFORM add_user_tag(demo_user_id, '测试用户', 'system');
        PERFORM add_user_tag(demo_user_id, '活跃用户', 'system');
        
        RAISE NOTICE '已插入初始聊天用户并分配标签';
    ELSE
        RAISE NOTICE '聊天用户表不为空，跳过初始化数据';
    END IF;
END
$$;

-- ===== 数据清理和维护工具 =====

-- 清理旧的聊天向量数据（超过30天）
CREATE OR REPLACE FUNCTION cleanup_old_chat_vectors(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM chat_vectors 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '已删除 % 条旧的聊天向量记录', deleted_count;
    RETURN deleted_count;
END;
$$;

-- 软删除会话及其相关数据
CREATE OR REPLACE FUNCTION soft_delete_session(session_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- 软删除会话
    UPDATE chat_sessions 
    SET is_deleted = TRUE, updated_at = NOW()
    WHERE id = session_uuid;
    
    -- 注意：消息和向量不需要软删除，因为有外键级联
    
    RETURN FOUND;
END;
$$;

-- ===== 验证和查询 =====

-- 显示当前聊天用户统计
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_users,
    COUNT(*) FILTER (WHERE is_deleted = TRUE) as deleted_users
FROM chat_users;

-- 显示当前会话统计
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_sessions,
    COUNT(DISTINCT user_id) as unique_users_with_sessions
FROM chat_sessions;

-- 显示消息统计
SELECT 
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE role = 'user') as user_messages,
    COUNT(*) FILTER (WHERE role = 'assistant') as ai_messages,
    COUNT(*) FILTER (WHERE is_processed = FALSE AND role = 'user') as pending_user_messages
FROM chat_messages;

-- 显示标签统计
SELECT 
    COUNT(*) as total_tags,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_tags
FROM chat_user_tags;

SELECT 
    t.tag_name,
    t.tag_color,
    COUNT(r.user_id) as user_count
FROM chat_user_tags t
LEFT JOIN chat_user_tag_relations r ON t.id = r.tag_id
WHERE t.is_active = TRUE
GROUP BY t.id, t.tag_name, t.tag_color
ORDER BY user_count DESC;

COMMIT; 