-- =================================================================
-- Filename: 01_chat_schema.sql
-- Description: Defines the schema for the Chat module (v2).
-- =================================================================

-- =================================================================
-- Table: chat_users
-- Stores information about chat users from various platforms.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT,
    platform TEXT,
    platform_username TEXT,
    avatar_url TEXT,
    metadata JSONB,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_users_uid_platform_key UNIQUE (uid, platform)
);

-- Indexes for chat_users
CREATE INDEX IF NOT EXISTS idx_chat_users_uid_platform ON public.chat_users(uid, platform);
CREATE INDEX IF NOT EXISTS idx_chat_users_is_deleted ON public.chat_users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_users_updated_at_desc ON public.chat_users(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on chat_users
CREATE OR REPLACE TRIGGER trigger_update_chat_users_updated_at
BEFORE UPDATE ON public.chat_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: chat_sessions
-- Stores chat sessions, linking users to conversations.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.chat_users(id) ON DELETE RESTRICT,
    character_id uuid, -- Foreign key will be added once characters is created
    session_name TEXT,
    language language_type NOT NULL DEFAULT 'en',
    message_merge_seconds INTEGER DEFAULT 300,
    topic_trigger_hours INTEGER DEFAULT 24,
    is_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_message_at TIMESTAMPTZ,
    last_processed_at TIMESTAMPTZ,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_deleted ON public.chat_sessions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at_desc ON public.chat_sessions(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on chat_sessions
CREATE OR REPLACE TRIGGER trigger_update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: chat_messages
-- Stores individual messages within a chat session.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.chat_users(id) ON DELETE SET NULL, -- Can be null for system/topic messages
    role chat_message_role_type NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    merge_group_id uuid,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at ON public.chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_processed ON public.chat_messages(is_processed);
CREATE INDEX IF NOT EXISTS idx_chat_messages_merge_group_id ON public.chat_messages(merge_group_id);

CREATE OR REPLACE TRIGGER handle_chat_message_change
AFTER INSERT OR UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_vectorization_request();

-- =================================================================
-- Table: chat_message_vectors
-- Stores vector embeddings for chat messages to enable semantic search.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.chat_message_vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding extensions.vector(1536),
    vector_type TEXT,
    language language_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_vectors_message_id_unique UNIQUE (message_id)
);

-- Indexes for chat_message_vectors
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_session_id ON public.chat_message_vectors(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_message_id ON public.chat_message_vectors(message_id);

-- HNSW Index for chat_message_vectors
-- Recommended for production after initial data load.
-- HNSW supports efficient search on newly added data without requiring a full re-index.
/*
CREATE INDEX IF NOT EXISTS idx_chat_message_vectors_embedding_hnsw ON public.chat_message_vectors
USING hnsw (embedding extensions.vector_l2_ops);
*/

-- =================================================================
-- RLS Policies for Chat Module
-- =================================================================

-- Policies for chat_users
ALTER TABLE public.chat_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.chat_users FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_users FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_users FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.chat_sessions FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_sessions FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_sessions FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to view messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_messages FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_messages FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for chat_message_vectors
ALTER TABLE public.chat_message_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to view message vectors" ON public.chat_message_vectors FOR SELECT USING (true);
CREATE POLICY "Allow admin/super_admin to insert" ON public.chat_message_vectors FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.chat_message_vectors FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
