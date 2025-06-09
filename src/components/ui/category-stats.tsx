'use client'

import { Plus } from 'lucide-react'

interface CategoryConfig {
  name: string
  icon: string
  color: string
}

interface CategoryStatsProps {
  categories: Record<string, CategoryConfig>
  data: { category: string }[]
  selectedCategory: string
  onCategorySelect: (category: string) => void
  onCreateCategory?: () => void
}

export function CategoryStats({ categories, data, selectedCategory, onCategorySelect, onCreateCategory }: CategoryStatsProps) {
  // 获取颜色样式
  const getColorClasses = (color: string, isSelected: boolean) => {
    if (isSelected) {
      const selectedMap: Record<string, string> = {
        blue: 'bg-blue-600 text-white border-blue-600',
        green: 'bg-green-600 text-white border-green-600',
        purple: 'bg-purple-600 text-white border-purple-600',
        orange: 'bg-orange-600 text-white border-orange-600',
        cyan: 'bg-cyan-600 text-white border-cyan-600',
        yellow: 'bg-yellow-600 text-white border-yellow-600',
        pink: 'bg-pink-600 text-white border-pink-600',
      }
      return selectedMap[color] || 'bg-gray-600 text-white border-gray-600'
    }
    
    const normalMap: Record<string, string> = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-900/30',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/30 hover:bg-purple-100 dark:hover:bg-purple-900/30',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/30 hover:bg-orange-100 dark:hover:bg-orange-900/30',
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/30',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/30 hover:bg-pink-100 dark:hover:bg-pink-900/30',
    }
    return normalMap[color] || 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          分类筛选：
        </span>
        <div className="flex flex-wrap gap-2">
          {/* 全部选项 */}
          <button
            onClick={() => onCategorySelect('all')}
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                : 'bg-white dark:bg-[var(--component-background)] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <span className="mr-1">📋</span>
            全部
            <span className="ml-1.5 opacity-75">({data.length})</span>
          </button>

          {/* 分类选项 */}
          {Object.entries(categories).map(([key, category]) => {
            const count = data.filter(item => item.category === key).length
            const isSelected = selectedCategory === key
            return (
              <button
                key={key}
                onClick={() => onCategorySelect(key)}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${getColorClasses(category.color, isSelected)}`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
                <span className="ml-1.5 opacity-75">({count})</span>
              </button>
            )
          })}

          {/* 创建分类按钮 */}
          {onCreateCategory && (
            <button
              onClick={onCreateCategory}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-[var(--component-background)] border border-dashed border-gray-300 dark:border-[var(--border-color)] rounded-full hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
              title="创建新分类"
            >
              <Plus className="w-3 h-3 mr-1" />
              添加分类
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 