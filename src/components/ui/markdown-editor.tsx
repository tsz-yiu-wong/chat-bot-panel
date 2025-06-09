'use client'

import { useState } from 'react'
import { Eye, Edit3 } from 'lucide-react'
import { Button } from './button'
import { Textarea } from './form'
import { MarkdownRenderer } from './markdown'

interface MarkdownEditorProps {
  label?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  required?: boolean
  placeholder?: string
  error?: string
}

export function MarkdownEditor({ 
  label,
  value, 
  onChange, 
  rows = 8, 
  required, 
  placeholder,
  error
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center bg-white dark:bg-[var(--component-background)] rounded-lg border border-gray-200 dark:border-[var(--border-color)] p-1">
            <Button
              type="button"
              variant={!isPreview ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setIsPreview(false)}
              className="h-7 px-3"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              编辑
            </Button>
            <Button
              type="button"
              variant={isPreview ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setIsPreview(true)}
              className="h-7 px-3"
            >
              <Eye className="w-3 h-3 mr-1" />
              预览
            </Button>
          </div>
        </div>
      )}
      
      <div className="border border-gray-200 dark:border-[var(--border-color)] rounded-lg overflow-hidden">
        {isPreview ? (
          <div className="min-h-[200px] p-4 bg-white dark:bg-[var(--component-background)]">
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="text-gray-400 dark:text-gray-500 italic">
                暂无内容，切换到编辑模式开始写作...
              </div>
            )}
          </div>
        ) : (
          <Textarea
            value={value}
            onChange={onChange}
            rows={rows}
            required={required}
            placeholder={placeholder}
            className="border-0 focus:ring-0 rounded-lg"
            error={error}
          />
        )}
      </div>
      
      {!isPreview && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          支持 Markdown 格式：**粗体**、*斜体*、`代码`、链接、列表等。换行请使用两个回车键创建段落分隔。
        </p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
} 