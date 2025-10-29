import { PromptStage } from './page';

/**
 * 按名称排序 Prompt 项目
 */
export function sortPrompts(items: any[]): any[] {
  return items.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    
    // 使用 localeCompare 进行排序（支持多语言）
    return nameA.localeCompare(nameB, 'zh-Hans-CN', { 
      sensitivity: 'base',
      numeric: true 
    });
  });
}

/**
 * 根据语言、阶段筛选和搜索 Prompt 项目
 */
export function filterPrompts(
  items: any[],
  selectedLanguage: string,
  selectedStage: string,
  searchQuery: string
) {
  const filtered = items.filter(item => {
    // 语言筛选
    if (selectedLanguage !== 'all' && item.language !== selectedLanguage) {
      return false;
    }

    // Stage 筛选
    if (selectedStage !== 'all' && item.stage_id !== selectedStage) {
      return false;
    }

    // 搜索筛选（在已筛选结果中搜索）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.name,
        item.prompt,
        item.mark
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(query);
    }

    return true;
  });

  // 应用排序
  return sortPrompts(filtered);
}
