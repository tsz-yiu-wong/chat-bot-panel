-- =================================================================
-- Filename: 00_extensions.sql
-- Description: Manages database extensions, moving them to a dedicated schema.
-- =================================================================
-- 1. Create a dedicated schema for extensions to improve security.
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. For existing databases, move the 'vector' extension from 'public' to the 'extensions' schema.
-- This is the migration step. We wrap it in a DO block to check for the extension's
-- existence in the 'public' schema before trying to move it, preventing errors on subsequent runs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  END IF;
END;
$$;

-- 3. For new databases, create the extension in the correct schema if it doesn't exist at all.
-- This command will not fail if the extension already exists (e.g., after being moved by the block above).
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 4. Enable pgcrypto for password hashing functions (e.g., crypt, gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
