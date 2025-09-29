'use server';

import { revalidatePath } from 'next/cache';
import { createServerActionClient } from '@/lib/supabase-server';

// 创建 Prompt 的数据类型
interface CreatePromptData {
  name: string;
  stage_id?: string;
  language: 'en' | 'zh' | 'vi';
  prompt?: string;
  mark?: string;
}

// 更新 Prompt 的数据类型
interface UpdatePromptData extends CreatePromptData {
  id: string;
}

/**
 * 创建 Prompt
 */
export async function createPrompt(data: CreatePromptData) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name?.trim()) {
      return { success: false, error: '名称为必填项' };
    }

    const { data: newPrompt, error } = await supabase
      .from('prompts')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建 Prompt 失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true, data: newPrompt };
  } catch (error) {
    console.error('创建 Prompt 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新 Prompt
 */
export async function updatePrompt(data: UpdatePromptData) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name?.trim()) {
      return { success: false, error: '名称为必填项' };
    }

    const { id, ...updateData } = data;
    const { data: updatedPrompt, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新 Prompt 失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true, data: updatedPrompt };
  } catch (error) {
    console.error('更新 Prompt 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除 Prompt
 */
export async function deletePrompt(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase
      .from('prompts')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('删除 Prompt 失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true };
  } catch (error) {
    console.error('删除 Prompt 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 创建 Stage
 */
export async function createStage(data: { name: string }) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name?.trim()) {
      return { success: false, error: 'Stage 名称为必填项' };
    }

    const { data: newStage, error } = await supabase
      .from('prompt_stages')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建 Stage 失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true, data: newStage };
  } catch (error) {
    console.error('创建 Stage 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新 Stage
 */
export async function updateStage(data: { id: string; name: string }) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name?.trim()) {
      return { success: false, error: 'Stage 名称为必填项' };
    }

    const { id, ...updateData } = data;
    const { data: updatedStage, error } = await supabase
      .from('prompt_stages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新 Stage 失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true, data: updatedStage };
  } catch (error) {
    console.error('更新 Stage 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除 Stage
 */
export async function deleteStage(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase
      .from('prompt_stages')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('删除 Stage 失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    revalidatePath('/prompts');
    return { success: true };
  } catch (error) {
    console.error('删除 Stage 异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}
