-- =================================================================
-- Filename: 01_chat_schema.sql
-- Description: Defines the schema for the Chat module (v2).
-- =================================================================

-- =================================================================
-- Table: chat_users
-- Stores information about chat users from various platforms.
-- Since each user only has one conversation session, session-related
-- fields are now directly stored in this table.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT,
    platform TEXT,
    platform_username TEXT,
    avatar_url TEXT,
    metadata JSONB,
    -- Session-related fields (moved from chat_sessions)
    language language_type NOT NULL, -- 要求明确指定语言，不设置默认值
    character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
    current_stage_id uuid REFERENCES public.prompt_stages(id) ON DELETE SET NULL,
    topic_trigger_hours INTEGER DEFAULT 24,
    is_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reply_delay_hours INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_users_uid_platform_key UNIQUE (uid, platform)
);

-- Indexes for chat_users
CREATE INDEX IF NOT EXISTS idx_chat_users_uid_platform ON public.chat_users(uid, platform);
CREATE INDEX IF NOT EXISTS idx_chat_users_character_id ON public.chat_users(character_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_current_stage_id ON public.chat_users(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_last_message_at ON public.chat_users(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_is_deleted ON public.chat_users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_users_updated_at_desc ON public.chat_users(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on chat_users
CREATE OR REPLACE TRIGGER trigger_update_chat_users_updated_at
BEFORE UPDATE ON public.chat_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: chat_messages
-- Stores individual messages for each user.
-- Since each user has only one conversation, messages are directly linked to user_id.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.chat_users(id) ON DELETE CASCADE,
    role chat_message_role_type NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE, -- Tracks if message has been analyzed for profile/episodic extraction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_created_at ON public.chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_unprocessed ON public.chat_messages(user_id, is_processed) WHERE is_processed = false;

-- Trigger function to update 'last_message_at' in chat_users when new messages are inserted
CREATE OR REPLACE FUNCTION public.update_user_last_message_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.chat_users
    SET last_message_at = NEW.created_at
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

-- Trigger to automatically update last_message_at
CREATE OR REPLACE TRIGGER trigger_update_last_message_at
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_user_last_message_at();


-- =================================================================
-- Table: chat_users_profile
-- Stores long-term user profile information in plain text format.
-- One profile per user.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_users_profile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.chat_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',  -- Plain text user profile (e.g., "小明，20岁，在读大学，家里有一只猫叫小白")
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_users_profile_user_id_unique UNIQUE (user_id)
);

-- Indexes for chat_users_profile
CREATE INDEX IF NOT EXISTS idx_chat_users_profile_user_id ON public.chat_users_profile(user_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER trigger_update_chat_users_profile_updated_at
BEFORE UPDATE ON public.chat_users_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: chat_users_episodic_memories
-- Stores important events/experiences as episodic memories.
-- Multiple episodes per user, searchable via vector embeddings.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_users_episodic_memories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.chat_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,             -- Episode description (50-200字，用于向量化和展示)
    embedding extensions.vector(1536), -- Vector for semantic search
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    access_count INTEGER DEFAULT 0,    -- How many times this memory was retrieved
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_users_episodic_memories
CREATE INDEX IF NOT EXISTS idx_chat_users_episodic_memories_user_id ON public.chat_users_episodic_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_episodic_memories_importance ON public.chat_users_episodic_memories(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_episodic_memories_created_at ON public.chat_users_episodic_memories(user_id, created_at DESC);

-- HNSW Index for semantic search (vector similarity)
CREATE INDEX IF NOT EXISTS idx_chat_users_episodic_memories_embedding_hnsw 
ON public.chat_users_episodic_memories
USING hnsw (embedding extensions.vector_cosine_ops);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER trigger_update_chat_users_episodic_memories_updated_at
BEFORE UPDATE ON public.chat_users_episodic_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to vectorize episodic memories
CREATE OR REPLACE TRIGGER handle_episodic_memory_change
AFTER INSERT OR UPDATE ON public.chat_users_episodic_memories
FOR EACH ROW
EXECUTE FUNCTION public.trigger_vectorization_request();

-- Function to increment episodic memory access count
CREATE OR REPLACE FUNCTION public.increment_episodic_access(memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.chat_users_episodic_memories
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = memory_id;
END;
$$;


-- =================================================================
-- RLS Policies for Chat Module
-- =================================================================

-- Policies for chat_users
ALTER TABLE public.chat_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.chat_users FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_users FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_users FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to view messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_messages FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_messages FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_users_profile
ALTER TABLE public.chat_users_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to view profiles" ON public.chat_users_profile FOR SELECT USING (true);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_users_profile FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_users_profile FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_users_episodic_memories
ALTER TABLE public.chat_users_episodic_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to view episodic memories" ON public.chat_users_episodic_memories FOR SELECT USING (true);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_users_episodic_memories FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_users_episodic_memories FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
