import { createServerActionClient } from '@/lib/supabase-server';
import { TopicsList } from './topics-list';

// 定义数据类型
export interface TopicCategory {
  id: string;
  name_zh: string | null;
  name_en: string | null;
  name_vi: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopicSubcategory {
  id: string;
  category_id: string;
  name_zh: string;
  name_en: string;
  name_vi: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  category_id: string;
  subcategory_id: string;
  content: string;
  usage_count: number;
  language: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // 关联的分类信息
  category?: TopicCategory | null;
  subcategory?: TopicSubcategory | null;
}

// 获取话题分类数据
async function getTopicCategories(): Promise<TopicCategory[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('topic_categories')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取话题分类失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Categories):', error);
    return [];
  }
}

// 获取所有语言选项（从数据库动态获取）
async function getLanguages(): Promise<string[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('topics')
      .select('language')
      .eq('is_deleted', false);

    if (error) {
      console.error('获取语言列表失败:', error);
      return [];
    }

    // 去重并排序
    const uniqueLanguages = Array.from(new Set(data?.map(item => item.language).filter(Boolean) || []));
    return uniqueLanguages.sort();
  } catch (error) {
    console.error('数据库连接异常 (Languages):', error);
    return [];
  }
}

// 获取话题子分类数据
async function getTopicSubcategories(): Promise<TopicSubcategory[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('topic_subcategories')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取话题子分类失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Subcategories):', error);
    return [];
  }
}

// 获取话题数据
async function getTopics(): Promise<Topic[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取话题失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Topics):', error);
    return [];
  }
}

export default async function TopicsPage() {
  try {
    // 并行获取数据以提高性能
    const dataPromise = Promise.all([
      getTopicCategories(),
      getTopicSubcategories(),
      getTopics(),
      getLanguages()
    ]);

    // 设置 10 秒超时，防止页面长时间卡顿
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('数据加载超时')), 10000);
    });

    const [allCategories, allSubcategories, topicsWithoutRelations, allLanguages] = await Promise.race([dataPromise, timeoutPromise]);

    // 在服务端进行数据关联
    const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat]));
    const subcategoriesMap = new Map(allSubcategories.map(sub => [sub.id, sub]));
    
    const topicsWithRelations = topicsWithoutRelations.map(topic => ({
      ...topic,
      category: topic.category_id ? categoriesMap.get(topic.category_id) || null : null,
      subcategory: topic.subcategory_id ? subcategoriesMap.get(topic.subcategory_id) || null : null
    }));

    return (
      <TopicsList 
        initialCategories={allCategories}
        initialSubcategories={allSubcategories}
        initialTopics={topicsWithRelations}
        initialLanguages={allLanguages}
      />
    );
  } catch (error) {
    console.error('话题库页面加载失败:', error);
    
    // 在超时或错误时，返回带有空数据的页面，避免崩溃
    return (
      <TopicsList 
        initialCategories={[]}
        initialSubcategories={[]}
        initialTopics={[]}
        initialLanguages={[]}
      />
    );
  }
}