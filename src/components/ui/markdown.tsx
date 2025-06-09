'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 自定义组件样式
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-gray-900 dark:text-gray-100">{children}</h3>,
          p: ({ children }) => <p className="mb-2 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-gray-700 dark:text-gray-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-gray-700 dark:text-gray-300">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-2 bg-blue-50 dark:bg-blue-900/20 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                  {children}
                </code>
              )
            }
            return (
              <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <div className="my-2">{children}</div>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-blue-600 dark:text-blue-400 hover:underline" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 first:rounded-tl-lg last:rounded-tr-lg">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 