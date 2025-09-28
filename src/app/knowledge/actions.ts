'use server';

import { revalidatePath } from 'next/cache';
import { createServerActionClient } from '@/lib/supabase-server';

// 创建知识库项目的数据类型
interface CreateKnowledgeItemData {
  knowledge_type: 'abbreviation' | 'script';
  category_id?: string;
  language: 'en' | 'zh' | 'vi';
  // abbreviation 类型字段
  abbreviation?: string;
  full_form?: string;
  description?: string;
  // script 类型字段
  user_text?: string;
  answer_text?: string;
}

// 更新知识库项目的数据类型
interface UpdateKnowledgeItemData extends CreateKnowledgeItemData {
  id: string;
}

/**
 * 创建知识库项目
 */
export async function createKnowledgeItem(data: CreateKnowledgeItemData) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (data.knowledge_type === 'abbreviation') {
      if (!data.abbreviation || !data.full_form) {
        return { success: false, error: '缩写和全称为必填项' };
      }
    } else if (data.knowledge_type === 'script') {
      if (!data.user_text || !data.answer_text) {
        return { success: false, error: '用户输入和回答内容为必填项' };
      }
    }

    const { data: newItem, error } = await supabase
      .from('knowledge_items')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建知识库项目失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true, data: newItem };
  } catch (error) {
    console.error('创建知识库项目异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新知识库项目
 */
export async function updateKnowledgeItem(data: UpdateKnowledgeItemData) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (data.knowledge_type === 'abbreviation') {
      if (!data.abbreviation || !data.full_form) {
        return { success: false, error: '缩写和全称为必填项' };
      }
    } else if (data.knowledge_type === 'script') {
      if (!data.user_text || !data.answer_text) {
        return { success: false, error: '用户输入和回答内容为必填项' };
      }
    }

    const { id, ...updateData } = data;
    const { data: updatedItem, error } = await supabase
      .from('knowledge_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新知识库项目失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true, data: updatedItem };
  } catch (error) {
    console.error('更新知识库项目异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除知识库项目
 */
export async function deleteKnowledgeItem(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase
      .from('knowledge_items')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('删除知识库项目失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true };
  } catch (error) {
    console.error('删除知识库项目异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 创建知识库分类
 */
export async function createKnowledgeCategory(data: {
  knowledge_type: 'abbreviation' | 'script';
  name_en?: string;
  name_zh?: string;
  name_vi?: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 至少需要一个语言的名称
    if (!data.name_en && !data.name_zh && !data.name_vi) {
      return { success: false, error: '至少需要提供一个语言的分类名称' };
    }

    const { data: newCategory, error } = await supabase
      .from('knowledge_categories')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建知识库分类失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true, data: newCategory };
  } catch (error) {
    console.error('创建知识库分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新知识库分类
 */
export async function updateKnowledgeCategory(data: {
  id: string;
  knowledge_type: 'abbreviation' | 'script';
  name_en?: string;
  name_zh?: string;
  name_vi?: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 至少需要一个语言的名称
    if (!data.name_en && !data.name_zh && !data.name_vi) {
      return { success: false, error: '至少需要提供一个语言的分类名称' };
    }

    const { id, ...updateData } = data;
    const { data: updatedCategory, error } = await supabase
      .from('knowledge_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新知识库分类失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true, data: updatedCategory };
  } catch (error) {
    console.error('更新知识库分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除知识库分类
 */
export async function deleteKnowledgeCategory(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase
      .from('knowledge_categories')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('删除知识库分类失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    revalidatePath('/knowledge');
    return { success: true };
  } catch (error) {
    console.error('删除知识库分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}
