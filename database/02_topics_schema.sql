-- =================================================================
-- Filename: 02_topics_schema.sql
-- Description: Defines the schema for the Topics Management module.
-- =================================================================

-- =================================================================
-- Table: topic_categories
-- Stores top-level topic categories.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.topic_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_zh TEXT,
    name_en TEXT,
    name_vi TEXT,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for topic_categories
CREATE INDEX IF NOT EXISTS idx_topic_categories_is_deleted ON public.topic_categories(is_deleted);
CREATE INDEX IF NOT EXISTS idx_topic_categories_updated_at_desc ON public.topic_categories(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on topic_categories
CREATE OR REPLACE TRIGGER trigger_update_topic_categories_updated_at
BEFORE UPDATE ON public.topic_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: topic_subcategories
-- Stores topic subcategories, linked to a main category.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.topic_subcategories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.topic_categories(id) ON DELETE SET NULL,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_vi TEXT NOT NULL,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for topic_subcategories
CREATE INDEX IF NOT EXISTS idx_topic_subcategories_category_id ON public.topic_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_topic_subcategories_is_deleted ON public.topic_subcategories(is_deleted);
CREATE INDEX IF NOT EXISTS idx_topic_subcategories_updated_at_desc ON public.topic_subcategories(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on topic_subcategories
CREATE OR REPLACE TRIGGER trigger_update_topic_subcategories_updated_at
BEFORE UPDATE ON public.topic_subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =================================================================
-- Table: topics
-- Stores the actual topic items.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.topic_categories(id) ON DELETE SET NULL,
    subcategory_id uuid NOT NULL REFERENCES public.topic_subcategories(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    language language_type NOT NULL,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for topics
CREATE INDEX IF NOT EXISTS idx_topics_category_id ON public.topics(category_id);
CREATE INDEX IF NOT EXISTS idx_topics_subcategory_id ON public.topics(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_topics_language ON public.topics(language);
CREATE INDEX IF NOT EXISTS idx_topics_is_deleted ON public.topics(is_deleted);
CREATE INDEX IF NOT EXISTS idx_topics_updated_at_desc ON public.topics(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on topics
CREATE OR REPLACE TRIGGER trigger_update_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =================================================================
-- RLS Policies for Topics Module
-- =================================================================
-- General Rule:
-- 1. All users can SELECT. Admins can see soft-deleted, users cannot.
-- 2. Only admin/super_admin can INSERT, UPDATE.
-- 3. No one can DELETE.

-- Policies for topic_categories
ALTER TABLE public.topic_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.topic_categories FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.topic_categories FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.topic_categories FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for topic_subcategories
ALTER TABLE public.topic_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.topic_subcategories FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.topic_subcategories FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.topic_subcategories FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.topics FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.topics FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.topics FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
