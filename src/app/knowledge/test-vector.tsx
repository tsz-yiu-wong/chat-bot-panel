'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { Search, X } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  content: string
  type: string
  similarity: number
  metadata: Record<string, unknown>
}

interface SearchResponse {
  results: SearchResult[]
}

interface VectorTestComponentProps {
  activeTab: 'abbreviations' | 'scripts'
}

export function VectorTestComponent({ activeTab }: VectorTestComponentProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(0.4)
  const [thresholdInput, setThresholdInput] = useState('0.4')
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    // 创建新的AbortController
    const controller = new AbortController()
    setAbortController(controller)
    
    setLoading(true)
    setError(null)
    setResults([])
    setHasSearched(true)
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          similarity_threshold: threshold,
          document_type: activeTab === 'abbreviations' ? 'abbreviation' : 'script'
        }),
        signal: controller.signal
      })

      if (controller.signal.aborted) {
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '搜索失败')
      }

      const data: SearchResponse = await response.json()
      
      if (controller.signal.aborted) {
        return
      }
      
      setResults(data.results || [])
      console.log('知识库向量检索结果:', data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('检索已被用户取消')
        setError('检索已取消')
        return
      }
      
      console.error('检索失败:', error)
      setError(error instanceof Error ? error.message : '检索失败')
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  // 取消检索
  const handleCancelSearch = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setLoading(false)
      setError('检索已取消')
    }
  }

  // 清除错误状态
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (error === '检索已取消') {
      setError(null)
    }
    if (hasSearched) {
      setHasSearched(false)
      setResults([])
    }
  }

  const handleThresholdChange = (value: string) => {
    setThresholdInput(value)
    
    if (error === '检索已取消') {
      setError(null)
    }
    
    if (value.trim() === '') {
      setThresholdError('请输入相似度阈值')
      return
    }
    
    const num = parseFloat(value)
    if (isNaN(num)) {
      setThresholdError('请输入有效的数字')
      return
    }
    
    if (num < 0 || num > 1) {
      setThresholdError('相似度阈值必须在 0.0 到 1.0 之间')
      return
    }
    
    setThresholdError(null)
    setThreshold(num)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch()
    }
  }

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
      <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100 flex items-center">
        <Search className="w-5 h-5 mr-2" />
        {activeTab === 'abbreviations' ? '缩写库' : '话术库'}向量检索测试
      </h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex space-x-2">
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e)}
            onKeyPress={handleKeyPress}
            placeholder={`输入检索查询（例如：${activeTab === 'abbreviations' ? 'Q.1、越南语、问候' : '问候、感谢、道歉'}...）`}
            className="flex-1"
            disabled={loading}
          />
          {!loading ? (
            <Button 
              onClick={handleSearch}
              disabled={!query.trim() || !!thresholdError}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              检索
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                disabled
                className="opacity-50 flex items-center space-x-2 bg-blue-600 text-white"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>检索中...</span>
              </Button>
              <Button 
                onClick={handleCancelSearch}
                variant="secondary"
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                title="取消检索"
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">相似度阈值:</label>
            <div className="flex flex-col">
              <Input
                type="text"
                value={thresholdInput}
                onChange={(e) => handleThresholdChange(e.target.value)}
                placeholder="0.4"
                className={`w-20 ${thresholdError ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {thresholdError && (
                <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {thresholdError}
                </span>
              )}
            </div>
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (0.0-1.0, 越高越严格)
          </span>
        </div>
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-lg border ${
          error === '检索已取消' 
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-sm ${
            error === '检索已取消'
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {error === '检索已取消' ? '⚠️ ' : '❌ '}
            {error === '检索已取消' ? '检索已被取消' : `错误: ${error}`}
          </p>
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {activeTab === 'abbreviations' ? '缩写库' : '话术库'}检索结果 ({results.length}):
          </h4>
          {results.map((result, index) => {
            const categoryText = result.metadata?.category ? String(result.metadata.category) : null
            const scenarioText = result.metadata?.scenario ? String(result.metadata.scenario) : null
            
            return (
            <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {activeTab === 'abbreviations' && categoryText 
                      ? categoryText 
                      : activeTab === 'scripts' && scenarioText 
                        ? scenarioText 
                        : result.type === 'abbreviation' ? '缩写' : '话术'
                    }
                  </span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {(result.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                {result.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content}
              </div>
            </div>
            )
          })}
        </div>
      ) : hasSearched && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            在{activeTab === 'abbreviations' ? '缩写库' : '话术库'}中没有找到匹配的结果，尝试降低相似度阈值或使用不同的查询词
          </p>
        </div>
      )}
    </div>
  )
} 