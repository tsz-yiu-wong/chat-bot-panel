'use client'

import { useState } from 'react'
import { Edit, Trash2, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './button'
import { MarkdownRenderer } from './markdown'

interface ContentCardProps {
  title: string
  content: string
  category: {
    name: string
    icon: string
    color: string
  }
  variables?: Record<string, string>
  onEdit: () => void
  onDelete: () => void
  maxLength?: number
  isDocument?: boolean
}

// 获取颜色类名
function getCategoryColorClasses(color: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-200',
    green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-200',
    purple: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800/30 dark:text-purple-200',
    orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/30 dark:text-orange-200',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-800/30 dark:text-cyan-200',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-200',
    pink: 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-900/20 dark:border-pink-800/30 dark:text-pink-200',
  }
  return colorMap[color] || colorMap.blue
}

export function ContentCard({ 
  title,
  content,
  category,
  variables,
  onEdit,
  onDelete,
  maxLength = 150,
  isDocument = false
}: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 智能截断：如果是文档且包含表格，显示完整表格
  const getDisplayContent = () => {
    if (isExpanded) return content
    
    if (isDocument) {
      // 检查是否包含表格
      const hasTable = content.includes('|') && content.includes('---')
      if (hasTable && content.length > maxLength) {
        // 尝试找到表格结束位置
        const lines = content.split('\n')
        let tableEnd = -1
        let inTable = false
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('|')) {
            inTable = true
          } else if (inTable && lines[i].trim() === '') {
            tableEnd = i
            break
          }
        }
        
        if (tableEnd > -1) {
          const tableContent = lines.slice(0, tableEnd + 1).join('\n')
          return tableContent.length <= maxLength * 2 ? tableContent : content.slice(0, maxLength) + '...'
        }
      }
    }
    
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content
  }

  const displayContent = getDisplayContent()
  const shouldTruncate = content.length > maxLength

  return (
    <div className="bg-white dark:bg-[var(--component-background)] rounded-xl border border-gray-200 dark:border-[var(--border-color)] hover:shadow-lg transition-all duration-200 group">
      {/* 卡片头部 */}
      <div className="p-5 border-b border-gray-100 dark:border-[var(--border-color)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColorClasses(category.color)}`}>
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </div>
            {variables && Object.keys(variables).length > 0 && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Hash className="w-3 h-3 mr-1" />
                {Object.keys(variables).length}个变量
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEdit} 
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete} 
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
          {title}
        </h3>
      </div>

      {/* 卡片内容 */}
      <div className="p-5">
        <div className="mb-4">
          {isDocument ? (
            <MarkdownRenderer content={displayContent} />
          ) : (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {displayContent}
            </pre>
          )}
          
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs h-6 px-2"
            >
              {isExpanded ? (
                <>
                  收起 <ChevronUp className="w-3 h-3 ml-1" />
                </>
              ) : (
                <>
                  展开 <ChevronDown className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* 变量 */}
        {variables && Object.keys(variables).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(variables).slice(0, 3).map(([key, value]) => (
              <span key={key} className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                {key}: {value.length > 10 ? value.slice(0, 10) + '...' : value}
              </span>
            ))}
            {Object.keys(variables).length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                +{Object.keys(variables).length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 