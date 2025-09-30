import { createServerActionClient } from '@/lib/supabase-server';
import { CharactersList } from './characters-list';

// Define the language type directly
export type language_type = 'en' | 'zh' | 'vi';

// Corresponds to the 'characters' table in 05_characters_schema.sql
export interface Character {
  id: string;
  language: language_type;
  name: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  job_title: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  zodiac: string | null;
  birth_date: string | null; // Date is stringified
  birth_place: string | null;
  current_address: string | null;
  work_address: string | null;
  daily_routine: string | null;
  favourite: string | null;
  family_member: string | null;
  worldview: string | null;
  life_philosophy: string | null;
  personal_values: string | null;
  future_plan: string | null;
  wish_place: string | null;
  life_dream: string | null;
  education_exp: string | null;
  work_exp: string | null;
  life_event: string | null;
  marital_status: string | null;
  relationship_exp: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Function to fetch all characters from the database
async function getCharacters(): Promise<Character[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch characters:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error (Characters):', error);
    return [];
  }
}

export default async function CharactersPage() {
  try {
    // Set a 10-second timeout to prevent the page from hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Data loading timeout')), 10000);
    });

    const characters = await Promise.race([getCharacters(), timeoutPromise]);

    return <CharactersList initialCharacters={characters} />;
  } catch (error) {
    console.error('Characters page failed to load:', error);
    
    // In case of a timeout or error, return the page with empty data to avoid crashing
    return <CharactersList initialCharacters={[]} />;
  }
}
