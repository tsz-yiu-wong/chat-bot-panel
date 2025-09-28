'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { KnowledgeCategory } from '../page';
import { getHydrationSafeCategoryDisplayName } from '../utils';

interface CategorySelectorProps {
  knowledgeType: 'abbreviation' | 'script';
  categories: KnowledgeCategory[];
  value: string;
  onChange: (value: string) => void;
  currentLanguage: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 分类选择器
 * 根据知识库类型动态显示可用分类的下拉选择组件
 */
export function CategorySelector({ 
  knowledgeType,
  categories,
  value, 
  onChange, 
  currentLanguage,
  disabled = false,
  className = "justify-between min-w-[120px]"
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, isMounted } = useHydrationSafeTranslation();

  // 根据知识库类型过滤分类
  const availableCategories = categories
    .filter(cat => cat.knowledge_type === knowledgeType)
    .map(cat => ({
      ...cat,
      displayName: getHydrationSafeCategoryDisplayName(cat, currentLanguage, isMounted)
    }))
    .filter(cat => cat.displayName);

  // 获取当前选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!value) return t('knowledge.placeholders.select_category');
    const category = availableCategories.find(cat => cat.id === value);
    return category?.displayName || t('knowledge.placeholders.select_category');
  };

  const label = knowledgeType === 'abbreviation' 
    ? t('knowledge.labels.category') 
    : t('knowledge.labels.scene');

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={className}
            disabled={disabled}
          >
            {getSelectedCategoryName()}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {availableCategories.map(category => (
            <DropdownMenuItem 
              key={category.id}
              onClick={() => onChange(category.id)}
            >
              {category.displayName}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
