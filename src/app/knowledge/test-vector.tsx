'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { searchSimilarDocuments } from '@/lib/vector'

interface SearchResult {
  id: string
  title: string
  content: string
  type: string
  similarity: number
  metadata: any
}

interface SearchResponse {
  results: SearchResult[]
  query_embedding_length?: number
  total_vectors_checked?: number
  debug?: {
    similarity_threshold: number
    query: string
    found_above_threshold: number
  }
}

export function VectorTestComponent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(0.1)
  const [thresholdInput, setThresholdInput] = useState('0.1')
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [vectorStats, setVectorStats] = useState<any>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          similarity_threshold: threshold
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '搜索失败')
      }

      const data: SearchResponse = await response.json()
      setResults(data.results || [])
      setDebugInfo(data)
      console.log('完整检索结果:', data)
    } catch (error) {
      console.error('检索失败:', error)
      setError(error instanceof Error ? error.message : '检索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getVectorStats = async () => {
    try {
      const response = await fetch('/api/search', { method: 'GET' })
      if (!response.ok) {
        throw new Error('获取统计信息失败')
      }
      const data = await response.json()
      setVectorStats(data.stats)
    } catch (error) {
      console.error('获取向量统计失败:', error)
      setError(error instanceof Error ? error.message : '获取统计信息失败')
    }
  }

  const handleThresholdChange = (value: string) => {
    setThresholdInput(value)
    
    // 验证输入是否为合法数字
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
    
    // 验证通过，更新阈值
    setThresholdError(null)
    setThreshold(num)
  }

  return (
    <div className="p-6 bg-white dark:bg-[var(--component-background)] rounded-2xl border border-gray-100 dark:border-[var(--border-color)]">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">向量检索测试</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex space-x-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入检索查询（例如：Q.1、越南语、问候...）"
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={loading || !query.trim() || !!thresholdError}
          >
            {loading ? '检索中...' : '检索'}
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">相似度阈值:</label>
          <div className="flex flex-col">
            <Input
              type="text"
              value={thresholdInput}
              onChange={(e) => handleThresholdChange(e.target.value)}
              placeholder="0.1"
              className={`w-24 ${thresholdError ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {thresholdError && (
              <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                {thresholdError}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (0.0-1.0, 越高越严格)
          </span>
        </div>
      </div>

      <div className="mb-4">
        <Button 
          onClick={getVectorStats}
          variant="secondary"
          className="text-sm"
        >
          查看向量统计
        </Button>
      </div>

      {vectorStats && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">向量数据统计</h4>
          <div className="text-sm text-green-600 dark:text-green-300 space-y-1">
            <p>向量总数: {vectorStats.total_vectors}</p>
            <div>
              按类型分布:
              {Object.entries(vectorStats.by_type).map(([type, count]) => (
                <span key={type} className="ml-2 inline-block">
                  {type}: {count as number}
                </span>
              ))}
            </div>
            {vectorStats.sample_data && vectorStats.sample_data.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">查看样本数据</summary>
                <pre className="mt-1 text-xs bg-green-100 dark:bg-green-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(vectorStats.sample_data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">错误: {error}</p>
        </div>
      )}

      {debugInfo && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">调试信息</h4>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <p>查询向量维度: {debugInfo.query_embedding_length}</p>
            <p>检查的向量总数: {debugInfo.total_vectors_checked}</p>
            <p>超过阈值的结果: {debugInfo.debug?.found_above_threshold}</p>
            <p>相似度阈值: {debugInfo.debug?.similarity_threshold}</p>
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            检索结果 ({results.length}):
          </h4>
          {results.map((result, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    result.type === 'abbreviation' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  }`}>
                    {result.type === 'abbreviation' ? '缩写' : '话术'}
                  </span>
                  {result.metadata?.category && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {result.metadata.category}
                    </span>
                  )}
                  {result.metadata?.scenario && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {result.metadata.scenario}
                    </span>
                  )}
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
          ))}
        </div>
      ) : !loading && query && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            没有找到相关结果，尝试降低相似度阈值或使用不同的查询词
          </p>
        </div>
      )}
    </div>
  )
} 