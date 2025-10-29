import { KnowledgeCategory } from './page';

/**
 * 根据当前语言获取分类的显示名称
 * 优先级：当前语言 > 英文 > 空字符串
 */
export function getCategoryDisplayName(
  category: KnowledgeCategory | null | undefined,
  currentLanguage: string
): string {
  if (!category) return '';

  switch (currentLanguage) {
    case 'vi':
      return category.name_vi || category.name_en || '';
    case 'zh':
      return category.name_zh || category.name_en || '';
    case 'en':
    default:
      return category.name_en || '';
  }
}

/**
 * Hydration-safe版本的分类显示名称获取函数
 * 服务端渲染时使用中文作为默认语言，避免hydration不匹配
 */
export function getHydrationSafeCategoryDisplayName(
  category: KnowledgeCategory | null | undefined,
  currentLanguage: string,
  isMounted: boolean = false
): string {
  if (!category) return '';

  // 服务端渲染或未挂载时，使用中文作为默认语言
  if (!isMounted) {
    return category.name_zh || category.name_en || '';
  }

  // 客户端hydration完成后，使用实际的当前语言
  return getCategoryDisplayName(category, currentLanguage);
}

/**
 * 获取排序关键字（缩写或用户输入文本的首字母）
 */
function getSortKey(item: any): string {
  if (item.knowledge_type === 'abbreviation' && item.abbreviation) {
    return item.abbreviation.toLowerCase();
  }
  if (item.knowledge_type === 'script' && item.user_text) {
    return item.user_text.toLowerCase();
  }
  return '';
}

/**
 * 按首字母排序知识库项目
 */
export function sortKnowledgeItems(items: any[]): any[] {
  return items.sort((a, b) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);
    
    // 如果有中文字符，使用 localeCompare 进行排序（支持拼音排序）
    return keyA.localeCompare(keyB, 'zh-Hans-CN', { 
      sensitivity: 'base',
      numeric: true 
    });
  });
}

/**
 * 根据语言、知识库类型和分类过滤项目
 */
export function filterKnowledgeItems(
  items: any[],
  selectedLanguage: string,
  selectedType: string,
  selectedCategory: string,
  searchQuery: string
) {
  const filtered = items.filter(item => {
    // 语言筛选
    if (selectedLanguage !== 'all' && item.language !== selectedLanguage) {
      return false;
    }

    // 类型筛选
    if (selectedType !== 'all' && item.knowledge_type !== selectedType) {
      return false;
    }

    // 分类筛选
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
      return false;
    }

    // 搜索筛选（在已筛选结果中搜索）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.abbreviation,
        item.full_form,
        item.description,
        item.user_text,
        item.answer_text
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(query);
    }

    return true;
  });

  // 应用排序
  return sortKnowledgeItems(filtered);
}
