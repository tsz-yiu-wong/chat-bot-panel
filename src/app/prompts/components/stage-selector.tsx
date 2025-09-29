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

import { PromptStage } from '../page';

interface StageSelectorProps {
  stages: PromptStage[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Stage 选择器
 * 用于选择 Prompt 的 Stage
 */
export function StageSelector({ 
  stages,
  value, 
  onChange, 
  disabled = false,
  className = "justify-between min-w-[120px]"
}: StageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useHydrationSafeTranslation();

  // 获取当前选中 Stage 的显示名称
  const getSelectedStageName = () => {
    if (!value) return t('common.placeholders.select_field', { field: t('prompts.labels.stage') });
    const stage = stages.find(s => s.id === value);
    return stage?.name || t('common.placeholders.select_field', { field: t('prompts.labels.stage') });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{t('prompts.labels.stage')}</span>
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={className}
            disabled={disabled}
          >
            {getSelectedStageName()}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {stages.map(stage => (
            <DropdownMenuItem 
              key={stage.id}
              onClick={() => onChange(stage.id)}
            >
              {stage.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
