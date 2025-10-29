import { createServerActionClient } from '@/lib/supabase-server';
import { CharactersList } from './characters-list';

// Corresponds to the 'characters' table in 05_characters_schema.sql
export interface Character {
  id: string;
  language: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  ancestral_home: string | null;
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
  self_evaluation: string | null;
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

// 获取所有语言选项（从数据库动态获取）
async function getLanguages(): Promise<string[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('characters')
      .select('language')
      .eq('is_deleted', false);

    if (error) {
      console.error('Failed to fetch languages:', error);
      return [];
    }

    // 去重并排序
    const uniqueLanguages = Array.from(new Set(data?.map(item => item.language).filter(Boolean) || []));
    return uniqueLanguages.sort();
  } catch (error) {
    console.error('Database connection error (Languages):', error);
    return [];
  }
}

export default async function CharactersPage() {
  try {
    // 并行获取数据以提高性能
    const dataPromise = Promise.all([
      getCharacters(),
      getLanguages()
    ]);

    // Set a 10-second timeout to prevent the page from hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Data loading timeout')), 10000);
    });

    const [characters, allLanguages] = await Promise.race([dataPromise, timeoutPromise]);

    return (
      <CharactersList 
        initialCharacters={characters} 
        initialLanguages={allLanguages}
      />
    );
  } catch (error) {
    console.error('Characters page failed to load:', error);
    
    // In case of a timeout or error, return the page with empty data to avoid crashing
    return (
      <CharactersList 
        initialCharacters={[]} 
        initialLanguages={[]}
      />
    );
  }
}
