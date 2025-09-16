import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase URL and Key must be set in environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

def get_character(character_id: int) -> dict | None:
    """Fetches a character by its ID."""
    try:
        response = supabase.table("characters_v2").select("*").eq("id", character_id).single().execute()
        return response.data
    except Exception as e:
        print(f"Error fetching character {character_id}: {e}")
        return None

def get_prompt(prompt_id: int) -> dict | None:
    """Fetches a prompt by its ID."""
    try:
        response = supabase.table("prompts").select("*").eq("id", prompt_id).single().execute()
        return response.data
    except Exception as e:
        print(f"Error fetching prompt {prompt_id}: {e}")
        return None
