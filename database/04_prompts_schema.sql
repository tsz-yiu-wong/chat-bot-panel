-- =================================================================
-- Filename: 04_prompts_schema.sql
-- Description: Defines the schema for the Prompts Management module.
-- =================================================================

-- =================================================================
-- Table: prompts
-- Stores system prompts for the AI models.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    model_name TEXT,
    stage_name TEXT,
    prompt_zh TEXT,
    prompt_en TEXT,
    prompt_vi TEXT,
    mark TEXT,
    -- Standard Fields
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_name ON public.prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_stage_name ON public.prompts(stage_name);
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

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow view access based on role" ON public.prompts FOR SELECT USING (get_my_role() IN ('admin', 'super_admin') OR is_deleted = false);
CREATE POLICY "Allow admin/super_admin to insert" ON public.prompts FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'super_admin'));
CREATE POLICY "Allow admin/super_admin to update" ON public.prompts FOR UPDATE USING (get_my_role() IN ('admin', 'super_admin'));
