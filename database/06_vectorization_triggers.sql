-- =================================================================
-- Filename: 06_vectorization_triggers.sql
-- Description: Sets up triggers to automate vectorization via Edge Functions.
-- =================================================================

-- =================================================================
-- 1. Enable extensions
-- =================================================================
-- Ensure pg_net is available for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- =================================================================
-- 2. Create the trigger function (simplified version without Vault)
-- =================================================================
CREATE OR REPLACE FUNCTION public.trigger_vectorization_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a secure search_path for security definer functions.
SET search_path = public, extensions
AS $$
DECLARE
    -- Hard-coded Edge Function URL (replace with your actual URL)
    edge_function_url text := 'https://dqqwpeldlfplsnkybafy.supabase.co/functions/v1/vectorize-on-change';
BEGIN
    RAISE WARNING '[Vectorization Trigger] Fired for table: %', TG_TABLE_NAME;

    -- Skip vectorization if URL is not set
    IF edge_function_url IS NULL OR edge_function_url = '' THEN
        RAISE WARNING '[Vectorization Trigger] Edge Function URL not configured. Trigger will not fire.';
        RETURN NEW;
    END IF;

    -- Asynchronously call the Edge Function with the new record data
    DECLARE
        http_response jsonb;
        request_body jsonb;
    BEGIN
        request_body := jsonb_build_object('table', TG_TABLE_NAME, 'record', row_to_json(NEW));
        
        RAISE WARNING '[Vectorization Trigger] Calling Edge Function: %', edge_function_url;
        RAISE WARNING '[Vectorization Trigger] Request body: %', request_body::text;
        
        SELECT INTO http_response net.http_post(
            url := edge_function_url,
            body := request_body,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxcXdwZWxkbGZwbHNua3liYWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzNjY0NSwiZXhwIjoyMDczNDEyNjQ1fQ.MLEQXri-22xTNAJHFAp99RX8hzLPh13ciI3pQLMmj0w',
                'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxcXdwZWxkbGZwbHNua3liYWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzY2NDUsImV4cCI6MjA3MzQxMjY0NX0.1nw-ImPl1pybLQNZyHoiHejRXScqjr3geOT6aSVBpsc'
            )
        );
        
        RAISE WARNING '[Vectorization Trigger] HTTP Response: %', http_response::text;
        RAISE WARNING '[Vectorization Trigger] Edge Function called successfully.';
    EXCEPTION WHEN OTHERS THEN
        -- Log HTTP request errors but don't fail the transaction
        RAISE WARNING '[Vectorization Trigger] Failed to call vectorization edge function: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Grant execute permission on the function to the service_role,
-- which is the role used by the migration scripts.
GRANT EXECUTE ON FUNCTION public.trigger_vectorization_request() TO service_role;