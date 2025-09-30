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

interface KnowledgeTypeSelectorProps {
  value: 'abbreviation' | 'script';
  onChange: (value: 'abbreviation' | 'script') => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 知识库类型选择器
 * 在多个对话框中复用的下拉选择组件
 */
export function KnowledgeTypeSelector({ 
  value, 
  onChange, 
  disabled = false,
  className = "justify-between min-w-[120px]"
}: KnowledgeTypeSelectorProps) {
  const { t } = useHydrationSafeTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{t('knowledge.labels.knowledge_type')}</span>
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={className}
            disabled={disabled}
          >
            {t(`knowledge.types.${value}`)}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChange('abbreviation')}>
            {t('knowledge.types.abbreviation')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('script')}>
            {t('knowledge.types.script')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
