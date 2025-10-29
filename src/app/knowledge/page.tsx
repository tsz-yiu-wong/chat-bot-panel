import { createServerActionClient } from '@/lib/supabase-server';
import { KnowledgeList } from './knowledge-list';

// 定义数据类型
export interface KnowledgeCategory {
  id: string;
  knowledge_type: 'abbreviation' | 'script';
  name_en: string | null;
  name_zh: string | null;
  name_vi: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  knowledge_type: 'abbreviation' | 'script';
  category_id: string | null;
  language: string;
  // abbreviation 类型字段
  abbreviation?: string | null;
  full_form?: string | null;
  description?: string | null;
  // script 类型字段
  user_text?: string | null;
  answer_text?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // 关联的分类信息
  category?: KnowledgeCategory | null;
}

// 获取知识库分类数据
async function getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('knowledge_categories')
      .select('*')
      .eq('is_deleted', false) // 添加软删除过滤
      .order('knowledge_type', { ascending: true })
      .order('name_en', { ascending: true });

    if (error) {
      console.error('获取知识库分类失败:', error);
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
      .from('knowledge_items')
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

// 获取知识库项目数据
async function getKnowledgeItems(): Promise<KnowledgeItem[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*') // 仅获取项目本身，不进行关联查询
      .eq('is_deleted', false) // 添加软删除过滤
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取知识库项目失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Items):', error);
    return [];
  }
}

export default async function KnowledgePage() {
  try {
    // 并行获取数据以提高性能
    const dataPromise = Promise.all([
      getKnowledgeCategories(),
      getKnowledgeItems(),
      getLanguages()
    ]);

    // 设置 10 秒超时，防止页面长时间卡顿
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('数据加载超时')), 10000);
    });

    const [allCategories, itemsWithoutCategory, allLanguages] = await Promise.race([dataPromise, timeoutPromise]);

    // 在服务端进行数据关联
    const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat]));
    const itemsWithCategory = itemsWithoutCategory.map(item => ({
      ...item,
      category: item.category_id ? categoriesMap.get(item.category_id) || null : null
    }));

    return (
      <div className="flex flex-col h-full">
        <KnowledgeList 
          initialCategories={allCategories}
          initialItems={itemsWithCategory}
          initialLanguages={allLanguages}
        />
      </div>
    );
  } catch (error) {
    console.error('知识库页面加载失败:', error);
    
    // 在超时或错误时，返回带有空数据的页面，避免崩溃
    return (
      <div className="flex flex-col h-full">
        <KnowledgeList 
          initialCategories={[]}
          initialItems={[]}
          initialLanguages={[]}
        />
      </div>
    );
  }
}