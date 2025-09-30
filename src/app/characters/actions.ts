'use server';

import { revalidatePath } from 'next/cache';
import { createServerActionClient } from '@/lib/supabase-server';
import { Character, language_type } from './page';

/**
 * Create a new character with minimal information.
 */
export async function createCharacter(data: {
  name: string;
  language: language_type;
}) {
  try {
    const supabase = await createServerActionClient();

    if (!data.name || !data.language) {
      return { success: false, error: 'Name and language are required.' };
    }

    const { data: newCharacter, error } = await supabase
      .from('characters')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Failed to create character:', error);
      return { success: false, error: 'Failed to create. Please try again later.' };
    }

    revalidatePath('/characters');
    return { success: true, data: newCharacter };
  } catch (error) {
    console.error('Error creating character:', error);
    return { success: false, error: 'A system error occurred. Please try again later.' };
  }
}

/**
 * Update an existing character's details.
 * The input type excludes fields that should not be updated directly.
 */
export async function updateCharacter(data: Omit<Character, 'created_at' | 'is_deleted'>) {
  try {
    const supabase = await createServerActionClient();

    const { id, ...updateData } = data;

    // Ensure 'updated_at' is current
    updateData.updated_at = new Date().toISOString();

    const { data: updatedCharacters, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Failed to update character:', error);
      return { success: false, error: 'Failed to update. Please try again later.' };
    }

    if (!updatedCharacters || updatedCharacters.length === 0) {
      console.error('Update character failed: insufficient permissions or data does not exist');
      return { success: false, error: 'Update failed, insufficient permissions.' };
    }

    revalidatePath('/characters');
    return { success: true, data: updatedCharacters[0] };
  } catch (error) {
    console.error('Error updating character:', error);
    return { success: false, error: 'A system error occurred. Please try again later.' };
  }
}

/**
 * Soft delete a character.
 */
export async function deleteCharacter(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
      .from('characters')
      .update({ is_deleted: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Failed to delete character:', error);
      return { success: false, error: 'Failed to delete. Please try again later.' };
    }

    if (!data || data.length === 0) {
      console.error('Delete character failed: insufficient permissions or data does not exist');
      return { success: false, error: 'Delete failed, insufficient permissions.' };
    }

    revalidatePath('/characters');
    return { success: true };
  } catch (error) {
    console.error('Error deleting character:', error);
    return { success: false, error: 'A system error occurred. Please try again later.' };
  }
}
