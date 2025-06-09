'use client'

import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
  count?: number
  color?: string
  icon?: React.ReactNode
}

interface FilterTabsProps {
  label: string
  options: FilterOption[]
  selectedValue: string
  onValueChange: (value: string) => void
}

export function FilterTabs({ label, options, selectedValue, onValueChange }: FilterTabsProps) {
  const getTabClasses = (option: FilterOption, isSelected: boolean) => {
    if (isSelected) {
      if (option.color) {
        // 为有颜色的选项创建激活状态
        const colorMap: Record<string, string> = {
          purple: 'bg-purple-600 text-white border-purple-600',
          orange: 'bg-orange-600 text-white border-orange-600',
          cyan: 'bg-cyan-600 text-white border-cyan-600',
          pink: 'bg-pink-600 text-white border-pink-600',
          indigo: 'bg-indigo-600 text-white border-indigo-600'
        }
        return colorMap[option.color] || 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
      }
      return 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
    }
    
    if (option.color) {
      // 为有颜色的选项创建非激活状态
      const colorMap: Record<string, string> = {
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/30',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/30',
        cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/30',
        pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/40 hover:bg-pink-100 dark:hover:bg-pink-900/30',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
      }
      return colorMap[option.color] || 'bg-white dark:bg-[var(--component-background)] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500'
    }
    
    return 'bg-white dark:bg-[var(--component-background)] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500'
  }

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {label}：
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200',
              getTabClasses(option, selectedValue === option.value)
            )}
          >
            <div className="flex items-center space-x-1.5">
              {option.icon}
              <span>{option.label}</span>
              {typeof option.count !== 'undefined' && (
                <span className="opacity-75">({option.count})</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
} 