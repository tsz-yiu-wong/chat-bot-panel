-- =================================================================
-- Migration: Add increment_episodic_access function
-- Description: Creates a function to update access count and timestamp
--              for episodic memories when they are retrieved.
-- Usage: Run this on existing database to add the missing function.
-- =================================================================

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

