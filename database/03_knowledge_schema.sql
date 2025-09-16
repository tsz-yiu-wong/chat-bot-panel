-- =================================================================
-- Filename: 03_knowledge_schema.sql
-- Description: Defines the unified schema for the Knowledge Base module.
-- =================================================================

-- =================================================================
-- Table: knowledge_categories
-- Stores unified categories for all knowledge base items (abbreviations, scripts).
-- The 'type' column distinguishes which kind of item the category applies to.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_type knowledge_type NOT NULL, -- 'abbreviation' or 'script'
    name_zh TEXT,
    name_en TEXT,
    name_vi TEXT,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_categories_type ON public.knowledge_categories(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_categories_is_deleted ON public.knowledge_categories(is_deleted);
CREATE INDEX IF NOT EXISTS idx_knowledge_categories_updated_at_desc ON public.knowledge_categories(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_knowledge_categories_updated_at
BEFORE UPDATE ON public.knowledge_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: knowledge_items
-- Stores unified knowledge base items (abbreviations, scripts), replacing the two separate tables.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_type knowledge_type NOT NULL, -- 'abbreviation' or 'script' from 00_helpers.sql
    category_id uuid REFERENCES public.knowledge_categories(id) ON DELETE SET NULL,
    language language_type NOT NULL DEFAULT 'en',

    -- Fields for 'abbreviation' type
    abbreviation TEXT,
    full_form TEXT,
    description TEXT,

    -- Fields for 'script' type
    user_text TEXT,
    answer_text TEXT,

    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure type-specific fields are correctly populated
    CONSTRAINT check_knowledge_item_content CHECK (
        (knowledge_type = 'abbreviation' AND abbreviation IS NOT NULL AND full_form IS NOT NULL) OR
        (knowledge_type = 'script' AND user_text IS NOT NULL AND answer_text IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_category_id ON public.knowledge_items(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_is_deleted ON public.knowledge_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON public.knowledge_items(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated_at_desc ON public.knowledge_items(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_knowledge_items_updated_at
BEFORE UPDATE ON public.knowledge_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER handle_knowledge_item_change
AFTER INSERT OR UPDATE ON public.knowledge_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_vectorization_request();

-- Trigger to synchronize soft deletes to the knowledge_vectors table
CREATE OR REPLACE TRIGGER trigger_soft_delete_knowledge_vectors
BEFORE UPDATE ON public.knowledge_items
FOR EACH ROW
EXECUTE FUNCTION public.synchronize_vector_soft_delete('knowledge_vectors', 'item_id');




-- =================================================================
-- Table: knowledge_vectors
-- Stores vector embeddings for knowledge base items.
-- Now directly linked to the unified knowledge_items table.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.knowledge_vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
    vector_type TEXT,
    content TEXT NOT NULL,
    language language_type NOT NULL,
    embedding extensions.vector(1536),
    metadata JSONB,
    search_weight REAL DEFAULT 1.0,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT knowledge_vectors_item_id_unique UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_item_id ON public.knowledge_vectors(item_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_is_deleted ON public.knowledge_vectors(is_deleted);
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_updated_at_desc ON public.knowledge_vectors(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_knowledge_vectors_updated_at
BEFORE UPDATE ON public.knowledge_vectors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- HNSW Index for knowledge_vectors
-- Recommended for production after initial data load.
-- HNSW supports efficient search on newly added data without requiring a full re-index.
/*
CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_embedding_hnsw ON public.knowledge_vectors
USING hnsw (embedding extensions.vector_l2_ops);
*/

-- =================================================================
-- RLS Policies for Knowledge Module
-- =================================================================
-- General Rule:
-- 1. All users can SELECT. Admins can see soft-deleted, users cannot.
-- 2. Only admin/super_admin can INSERT, UPDATE.
-- 3. No one can DELETE.

-- Policies for knowledge_categories
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.knowledge_categories FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.knowledge_categories FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.knowledge_categories FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for knowledge_items
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.knowledge_items FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.knowledge_items FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.knowledge_items FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for knowledge_vectors
ALTER TABLE public.knowledge_vectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.knowledge_vectors FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.knowledge_vectors FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.knowledge_vectors FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));