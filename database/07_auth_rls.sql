-- =================================================================
-- Filename: 07_auth_rls.sql
-- Description: Defines user roles, profiles, and RLS helper functions.
-- =================================================================

-- =================================================================
-- 1. User Roles
-- Defines the roles for panel users.
-- =================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin');
    END IF;
END$$;


-- =================================================================
-- 2. Users Table
-- Stores public user data and role, linked to Supabase auth.
-- Note: Named 'users' as requested. This could potentially conflict with a default
-- 'users' view if one is created by Supabase. A name like 'profiles' is often safer.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    -- Add other user-specific fields here, e.g., full_name
    full_name TEXT,
    -- Standard Fields
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_users_updated_at_desc ON public.users(updated_at DESC NULLS LAST);


-- =================================================================
-- 3. New User Trigger
-- Automatically creates a user profile upon new user registration.
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create the new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- =================================================================
-- 4. Helper Functions for RLS
-- =================================================================

-- Function to get the current user's role from the users table
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result FROM public.users WHERE id = auth.uid();
    RETURN user_role_result;
END;
$$;


-- =================================================================
-- 5. RLS Policy for the Users Table Itself
-- =================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can see all profiles (e.g., to assign tasks, view team members)
CREATE POLICY "Allow all users to view profiles"
ON public.users
FOR SELECT
USING (true);

-- Users can only update their own profile.
CREATE POLICY "Allow users to update their own profile"
ON public.users
FOR UPDATE
USING ((select auth.uid()) = id);

-- No one can insert into the users table directly (it's handled by a trigger).
-- No one can delete from the users table. Deletion should be handled via Supabase Auth.
