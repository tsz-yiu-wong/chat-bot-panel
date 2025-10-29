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
import { SUPPORTED_LANGUAGES } from '@/lib/data-languages';
// import { LANGUAGE_LABELS } from '@/lib/data-languages'; // 取消注释以使用友好的语言显示名称

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[]; // 可选的语言选项列表，默认使用完整的 SUPPORTED_LANGUAGES
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * 语言选择器
 * 在多个对话框中复用的语言下拉选择组件
 * 
 * 使用场景：
 * - Dialog 中不传 options：默认显示所有支持的语言（SUPPORTED_LANGUAGES）
 * - 筛选器中传入 options：显示数据库中已存在的语言
 * 
 * 注意：如果需要显示友好的语言名称（如 "简体中文" 而不是 "zh-cn"）：
 * 1. 取消注释顶部的 LANGUAGE_LABELS 导入
 * 2. 取消注释下面 getDisplayName 函数和使用它的两处地方
 */
export function LanguageSelector({ 
  value, 
  onChange, 
  options = [...SUPPORTED_LANGUAGES], // 默认使用完整语言列表
  disabled = false,
  className = "justify-between min-w-[80px]",
  showLabel = true
}: LanguageSelectorProps) {
  const { t } = useHydrationSafeTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // 获取语言显示名称的辅助函数（取消注释以启用）
  // const getDisplayName = (lang: string) => {
  //   return LANGUAGE_LABELS?.[lang] || lang;
  // };

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
            {/* 使用友好显示名称：取消下一行注释，并注释掉再下一行 */}
            {/* {getDisplayName(value)} */}
            {value}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((lang) => (
            <DropdownMenuItem key={lang} onClick={() => onChange(lang)}>
              {/* 使用友好显示名称：取消下一行注释，并注释掉再下一行 */}
              {/* {getDisplayName(lang)} */}
              {lang}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
