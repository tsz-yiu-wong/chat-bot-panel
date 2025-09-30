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

interface LanguageSelectorProps {
  value: 'en' | 'zh' | 'vi';
  onChange: (value: 'en' | 'zh' | 'vi') => void;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * 语言选择器
 * 在多个对话框中复用的语言下拉选择组件
 */
export function LanguageSelector({ 
  value, 
  onChange, 
  disabled = false,
  className = "justify-between min-w-[80px]",
  showLabel = true
}: LanguageSelectorProps) {
  const { t } = useHydrationSafeTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-sm font-medium">{t('common.labels.language')}</span>}
      <DropdownMenu onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className={className}
            disabled={disabled}
          >
            {value}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChange('en')}>
            en
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('vi')}>
            vi
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('zh')}>
            zh
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
