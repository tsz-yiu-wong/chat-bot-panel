-- =================================================================
-- Filename: 04_prompts_schema.sql
-- Description: Defines the schema for the Prompts Management module.
-- Note: This table uses a "long" format for multi-language support,
-- where each language version of a prompt is a separate row.
-- The 'name' field acts as a common identifier for all language variants of the same prompt.
-- =================================================================

-- =================================================================
-- Table: prompt_stages
-- Stores stages for prompts (e.g., stage1, stage2, stage3).
-- =================================================================
CREATE TABLE IF NOT EXISTS public.prompt_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_stages_name ON public.prompt_stages(name);
CREATE INDEX IF NOT EXISTS idx_prompt_stages_is_deleted ON public.prompt_stages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_prompt_stages_updated_at_desc ON public.prompt_stages(updated_at DESC NULLS LAST);

CREATE OR REPLACE TRIGGER trigger_update_prompt_stages_updated_at
BEFORE UPDATE ON public.prompt_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =================================================================
-- Table: prompts
-- Stores system prompts for the AI models.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Identifier for a group of language-specific prompts
    stage_id uuid REFERENCES public.prompt_stages(id) ON DELETE SET NULL,
    language language_type NOT NULL, -- From 00_helpers.sql ('en', 'zh', 'vi')
    prompt TEXT,
    mark TEXT,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_name ON public.prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_stage_id ON public.prompts(stage_id);
CREATE INDEX IF NOT EXISTS idx_prompts_language ON public.prompts(language);
CREATE INDEX IF NOT EXISTS idx_prompts_is_deleted ON public.prompts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_prompts_updated_at_desc ON public.prompts(updated_at DESC NULLS LAST);

-- Trigger to update 'updated_at' timestamp on prompts
CREATE OR REPLACE TRIGGER trigger_update_prompts_updated_at
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =================================================================
-- RLS Policies for Prompts Module
-- =================================================================
-- General Rule:
-- 1. All users can SELECT. Admins can see soft-deleted, users cannot.
-- 2. Only admin/super_admin can INSERT, UPDATE.
-- 3. No one can DELETE.

-- Policies for prompt_stages
ALTER TABLE public.prompt_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.prompt_stages FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.prompt_stages FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.prompt_stages FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));

-- Policies for prompts
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.prompts FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.prompts FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.prompts FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
