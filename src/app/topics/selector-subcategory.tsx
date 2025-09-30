'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { TopicSubcategory } from './page';
import { getHydrationSafeSubcategoryDisplayName } from './utils';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface SubcategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  subcategories: TopicSubcategory[];
  selectedCategoryId: string;
  currentLanguage: string;
}

export function SubcategorySelector({ 
  value, 
  onChange, 
  subcategories,
  selectedCategoryId,
  currentLanguage 
}: SubcategorySelectorProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // 根据选中的 Category 过滤 Subcategories
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter(sub => sub.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  // 获取选中子分类的显示名称
  const getSelectedSubcategoryName = () => {
    if (!value) return t('common.placeholders.select_placeholder');
    const subcategory = filteredSubcategories.find(sub => sub.id === value);
    return subcategory ? getHydrationSafeSubcategoryDisplayName(subcategory, currentLanguage, isMounted) : t('common.placeholders.select_placeholder');
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm font-medium shrink-0">{t('topics.labels.subcategory')}</span>
      <DropdownMenu onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="justify-between min-w-[120px] max-w-[calc(100%-150px)]"
            disabled={!selectedCategoryId}
          >
            <span className="truncate">{getSelectedSubcategoryName()}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 ml-2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} ${!selectedCategoryId ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
          {filteredSubcategories.map(subcategory => (
            <DropdownMenuItem 
              key={subcategory.id}
              onClick={() => onChange(subcategory.id)}
            >
              {getHydrationSafeSubcategoryDisplayName(subcategory, currentLanguage, isMounted)}
            </DropdownMenuItem>
          ))}
          {filteredSubcategories.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              {selectedCategoryId 
                ? t('common.messages.no_items', { items: t('topics.labels.subcategory').toLowerCase() })
                : t('common.messages.select_first', { entity: t('topics.labels.category').toLowerCase() })
              }
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
