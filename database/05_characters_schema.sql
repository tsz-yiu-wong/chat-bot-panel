-- =================================================================
-- Filename: 05_characters_schema.sql
-- Description: Defines the schema for the Characters module, replacing bot_personalities.
-- =================================================================

-- =================================================================
-- Table: characters
-- Stores detailed profiles for each character/person.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.characters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    language language_type NOT NULL DEFAULT 'en',

    -- Core Information
    name TEXT,
    age INTEGER,
    gender TEXT,
    nationality TEXT,
    ancestral_home TEXT,
    job_title TEXT,

    -- Personal Information
    height_cm INTEGER,
    weight_kg INTEGER,
    blood_type TEXT,
    zodiac TEXT,
    birth_date DATE,
    birth_place TEXT,

    -- Life Information
    current_address TEXT,
    work_address TEXT,
    daily_routine TEXT,
    favourite TEXT,
    family_member TEXT,

    -- Worldview
    worldview TEXT,
    life_philosophy TEXT,
    personal_values TEXT,

    -- Dreams
    future_plan TEXT,
    wish_place TEXT,
    life_dream TEXT,

    -- Experience
    education_exp TEXT,
    work_exp TEXT,
    life_event TEXT,
    
    -- Relationship
    marital_status TEXT,
    relationship_exp TEXT,

    -- Self Evaluation (全局兜底向量)
    self_evaluation TEXT,

    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_is_deleted ON public.characters(is_deleted);
CREATE INDEX IF NOT EXISTS idx_characters_updated_at_desc ON public.characters(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_characters_updated_at
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER handle_character_change
AFTER INSERT OR UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.trigger_vectorization_request();

-- Trigger to synchronize soft deletes to the character_vectors table
CREATE OR REPLACE TRIGGER trigger_soft_delete_character_vectors
BEFORE UPDATE ON public.characters
FOR EACH ROW
EXECUTE FUNCTION public.synchronize_vector_soft_delete('character_vectors', 'character_id');


-- =================================================================
-- Table: character_images
-- Stores images associated with each character.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.character_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_images_character_id ON public.character_images(character_id);
CREATE INDEX IF NOT EXISTS idx_character_images_is_deleted ON public.character_images(is_deleted);
CREATE INDEX IF NOT EXISTS idx_character_images_updated_at_desc ON public.character_images(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_character_images_updated_at
BEFORE UPDATE ON public.character_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: character_vectors
-- Stores vector embeddings for character profile facets.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.character_vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    facet TEXT,
    content TEXT NOT NULL,
    language language_type NOT NULL,
    embedding extensions.vector(1536),
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT character_vectors_character_id_facet_unique UNIQUE (character_id, facet)
);

CREATE INDEX IF NOT EXISTS idx_character_vectors_character_id ON public.character_vectors(character_id);
CREATE INDEX IF NOT EXISTS idx_character_vectors_facet ON public.character_vectors(facet);
CREATE INDEX IF NOT EXISTS idx_character_vectors_is_deleted ON public.character_vectors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_character_vectors_updated_at_desc ON public.character_vectors(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_character_vectors_updated_at
BEFORE UPDATE ON public.character_vectors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();



-- =================================================================
-- Foreign Key Constraints
-- Add foreign key from chat_sessions to the new characters table.
-- =================================================================
ALTER TABLE public.chat_sessions
ADD CONSTRAINT fk_chat_sessions_character_id
FOREIGN KEY (character_id)
REFERENCES public.characters(id)
ON DELETE SET NULL;

-- HNSW Index for character_vectors
-- Recommended for production after initial data load.
/*
CREATE INDEX IF NOT EXISTS idx_character_vectors_embedding_hnsw ON public.character_vectors
USING hnsw (embedding extensions.vector_l2_ops);
*/

-- =================================================================
-- RLS Policies for Characters Module
-- =================================================================
-- General Rule:
-- 1. All users can SELECT. Admins can see soft-deleted, users cannot.
-- 2. Only admin/super_admin can INSERT, UPDATE.
-- 3. No one can DELETE.

-- Policies for characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.characters FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.characters FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.characters FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for character_images
ALTER TABLE public.character_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.character_images FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.character_images FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.character_images FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for character_vectors
ALTER TABLE public.character_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.character_vectors FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.character_vectors FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.character_vectors FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
