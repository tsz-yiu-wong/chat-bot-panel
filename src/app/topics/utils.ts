import { TopicCategory, TopicSubcategory } from './page';

/**
 * 根据当前语言获取分类的显示名称
 * 优先级：当前语言 > 英文 > 空字符串
 */
export function getCategoryDisplayName(
  category: TopicCategory | null | undefined,
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
 * 根据当前语言获取子分类的显示名称
 */
export function getSubcategoryDisplayName(
  subcategory: TopicSubcategory | null | undefined,
  currentLanguage: string
): string {
  if (!subcategory) return '';

  switch (currentLanguage) {
    case 'vi':
      return subcategory.name_vi || subcategory.name_en || '';
    case 'zh':
      return subcategory.name_zh || subcategory.name_en || '';
    case 'en':
    default:
      return subcategory.name_en || '';
  }
}

/**
 * Hydration-safe版本的分类显示名称获取函数
 * 服务端渲染时使用中文作为默认语言，避免hydration不匹配
 */
export function getHydrationSafeCategoryDisplayName(
  category: TopicCategory | null | undefined,
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
 * Hydration-safe版本的子分类显示名称获取函数
 */
export function getHydrationSafeSubcategoryDisplayName(
  subcategory: TopicSubcategory | null | undefined,
  currentLanguage: string,
  isMounted: boolean = false
): string {
  if (!subcategory) return '';

  // 服务端渲染或未挂载时，使用中文作为默认语言
  if (!isMounted) {
    return subcategory.name_zh || subcategory.name_en || '';
  }

  // 客户端hydration完成后，使用实际的当前语言
  return getSubcategoryDisplayName(subcategory, currentLanguage);
}

/**
 * 根据选中的分类和子分类以及搜索查询过滤话题
 */
export function filterTopics(
  topics: any[],
  selectedCategoryId: string | null,
  selectedSubcategoryId: string | null,
  searchQuery: string
) {
  return topics.filter(topic => {
    // 分类筛选
    if (selectedCategoryId && topic.category_id !== selectedCategoryId) {
      return false;
    }

    // 子分类筛选
    if (selectedSubcategoryId && topic.subcategory_id !== selectedSubcategoryId) {
      return false;
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return topic.content.toLowerCase().includes(query);
    }

    return true;
  });
}
