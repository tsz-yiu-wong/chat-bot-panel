'use server';

import { revalidatePath } from 'next/cache';
import { createServerActionClient } from '@/lib/supabase-server';

// ============================================================
// 话题分类 (Topic Categories) Actions
// ============================================================

/**
 * 创建话题分类
 */
export async function createTopicCategory(data: {
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
      .from('topic_categories')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建话题分类失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/topics');
    return { success: true, data: newCategory };
  } catch (error) {
    console.error('创建话题分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新话题分类
 */
export async function updateTopicCategory(data: {
  id: string;
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
    const { data: updatedCategories, error } = await supabase
      .from('topic_categories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新话题分类失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!updatedCategories || updatedCategories.length === 0) {
      console.error('更新话题分类失败: 权限不足或数据不存在');
      return { success: false, error: '更新失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true, data: updatedCategories[0] };
  } catch (error) {
    console.error('更新话题分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除话题分类
 */
export async function deleteTopicCategory(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
      .from('topic_categories')
      .update({ is_deleted: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('删除话题分类失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!data || data.length === 0) {
      console.error('删除话题分类失败: 权限不足或数据不存在');
      return { success: false, error: '删除失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true };
  } catch (error) {
    console.error('删除话题分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

// ============================================================
// 话题子分类 (Topic Subcategories) Actions
// ============================================================

/**
 * 创建话题子分类
 */
export async function createTopicSubcategory(data: {
  category_id: string;
  name_en: string;
  name_zh: string;
  name_vi: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name_en || !data.name_zh || !data.name_vi) {
      return { success: false, error: '所有语言的名称都为必填项' };
    }

    const { data: newSubcategory, error } = await supabase
      .from('topic_subcategories')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('创建话题子分类失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/topics');
    return { success: true, data: newSubcategory };
  } catch (error) {
    console.error('创建话题子分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新话题子分类
 */
export async function updateTopicSubcategory(data: {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  name_vi: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.name_en || !data.name_zh || !data.name_vi) {
      return { success: false, error: '所有语言的名称都为必填项' };
    }

    const { id, ...updateData } = data;
    const { data: updatedSubcategories, error } = await supabase
      .from('topic_subcategories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新话题子分类失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!updatedSubcategories || updatedSubcategories.length === 0) {
      console.error('更新话题子分类失败: 权限不足或数据不存在');
      return { success: false, error: '更新失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true, data: updatedSubcategories[0] };
  } catch (error) {
    console.error('更新话题子分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除话题子分类
 */
export async function deleteTopicSubcategory(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
      .from('topic_subcategories')
      .update({ is_deleted: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('删除话题子分类失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!data || data.length === 0) {
      console.error('删除话题子分类失败: 权限不足或数据不存在');
      return { success: false, error: '删除失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true };
  } catch (error) {
    console.error('删除话题子分类异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

// ============================================================
// 话题 (Topics) Actions
// ============================================================

/**
 * 创建话题
 */
export async function createTopic(data: {
  category_id: string;
  subcategory_id: string;
  content: string;
  language: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.category_id || !data.subcategory_id || !data.content || !data.language) {
      return { success: false, error: '所有字段都为必填项' };
    }

    const { data: newTopic, error } = await supabase
      .from('topics')
      .insert([{ ...data, usage_count: 0 }])
      .select()
      .single();

    if (error) {
      console.error('创建话题失败:', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }

    revalidatePath('/topics');
    return { success: true, data: newTopic };
  } catch (error) {
    console.error('创建话题异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 更新话题
 */
export async function updateTopic(data: {
  id: string;
  category_id: string;
  subcategory_id: string;
  content: string;
  language: string;
}) {
  try {
    const supabase = await createServerActionClient();

    // 验证必填字段
    if (!data.category_id || !data.subcategory_id || !data.content || !data.language) {
      return { success: false, error: '所有字段都为必填项' };
    }

    const { id, ...updateData } = data;
    const { data: updatedTopics, error } = await supabase
      .from('topics')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新话题失败:', error);
      return { success: false, error: '更新失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!updatedTopics || updatedTopics.length === 0) {
      console.error('更新话题失败: 权限不足或数据不存在');
      return { success: false, error: '更新失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true, data: updatedTopics[0] };
  } catch (error) {
    console.error('更新话题异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}

/**
 * 软删除话题
 */
export async function deleteTopic(id: string) {
  try {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
      .from('topics')
      .update({ is_deleted: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('删除话题失败:', error);
      return { success: false, error: '删除失败，请稍后重试' };
    }

    // 检查是否真的有数据被更新（权限不足时 data 为空数组）
    if (!data || data.length === 0) {
      console.error('删除话题失败: 权限不足或数据不存在');
      return { success: false, error: '删除失败，权限不足' };
    }

    revalidatePath('/topics');
    return { success: true };
  } catch (error) {
    console.error('删除话题异常:', error);
    return { success: false, error: '系统错误，请稍后重试' };
  }
}
