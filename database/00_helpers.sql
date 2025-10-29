-- =================================================================
-- Filename: 00_helpers.sql
-- Description: Defines helper functions and custom types for the database.
-- =================================================================

-- =================================================================
-- 0. Custom Types
-- =================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_type') THEN
        CREATE TYPE public.language_type AS ENUM ('en', 'zh-cn', 'zh-tw', 'ja', 'ko', 'vi');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'knowledge_type') THEN
        CREATE TYPE public.knowledge_type AS ENUM ('abbreviation', 'script');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_message_role_type') THEN
        CREATE TYPE public.chat_message_role_type AS ENUM ('system', 'user', 'assistant');
    END IF;
END$$;

-- =================================================================
-- 1. Standard Functions
-- =================================================================
-- 自动更新 'updated_at' 字段的时间戳。
-- 此函数可作为 BEFORE UPDATE 触发器附加到任何表上。
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =================================================================
-- 2. Soft Delete Synchronization
-- =================================================================
-- 当主表被软删除时, 同步更新其关联向量表的 'is_deleted' 状态。
-- 用法:
-- CREATE TRIGGER trigger_name
-- BEFORE UPDATE ON public.parent_table
-- FOR EACH ROW
-- EXECUTE FUNCTION public.synchronize_vector_soft_delete('vector_table_name', 'foreign_key_column_name');
-- 参数:
--   TG_ARGV[0]: 目标向量表的名称 (例如, 'character_vectors')。
--   TG_ARGV[1]: 向量表中指向父表的外键列名 (例如, 'character_id')。
CREATE OR REPLACE FUNCTION public.synchronize_vector_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- 确保只在从未删除变为已删除时触发
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        EXECUTE format(
            'UPDATE public.%I SET is_deleted = TRUE WHERE %I = $1',
            TG_ARGV[0], -- vector table name
            TG_ARGV[1]  -- foreign key column name
        ) USING OLD.id;
    END IF;
    RETURN NEW;
END;
$$;
