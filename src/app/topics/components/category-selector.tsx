'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { TopicCategory } from '../page';
import { getHydrationSafeCategoryDisplayName } from '../utils';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  categories: TopicCategory[];
  currentLanguage: string;
}

export function CategorySelector({ 
  value, 
  onChange, 
  categories,
  currentLanguage 
}: CategorySelectorProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // 获取选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!value) return t('common.placeholders.select_placeholder');
    const category = categories.find(cat => cat.id === value);
    return category ? getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted) : t('common.placeholders.select_placeholder');
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm font-medium shrink-0">{t('topics.labels.category')}</span>
      <DropdownMenu onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[120px] max-w-[calc(100%-120px)]">
            <span className="truncate">{getSelectedCategoryName()}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 ml-2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
          {categories.map(category => (
            <DropdownMenuItem 
              key={category.id}
              onClick={() => onChange(category.id)}
            >
              {getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted)}
            </DropdownMenuItem>
          ))}
          {categories.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              {t('common.messages.no_items', { items: t('topics.labels.category').toLowerCase() })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
