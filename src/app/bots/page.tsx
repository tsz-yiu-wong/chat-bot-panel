'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, User, Image, BookOpen, Search, ChevronDown, X } from 'lucide-react'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Form, Input } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading'
import PersonalityFormField from '@/components/ui/personality-form-field'
import ImageUpload from '@/components/ui/image-upload'
import { BotPersonality, BotImage, FORM_FIELD_GROUPS } from '@/lib/types/bot-personality'
import { Language, CATEGORY_LABELS } from '@/lib/bot-personality-lang'

// 向量检索结果类型
interface VectorSearchResult {
  bot_id: string
  bot_name: string
  vector_type: string
  content: string
  similarity: number
  search_weight: number
  metadata: Record<string, unknown>
  personality?: {
    id: string
    bot_name: string
    nationality?: string
    age?: number
    gender?: string
    current_job?: string
    values?: string
    hobbies?: string
  }
}

interface VectorSearchResponse {
  results: VectorSearchResult[]
  total: number
  query: string
  similarity_threshold: number
}

// 向量检索组件
interface VectorTestComponentProps {
  currentBotId?: string
  botName?: string
}

function VectorTestComponent({ currentBotId, botName }: VectorTestComponentProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(0.3)
  const [thresholdInput, setThresholdInput] = useState('0.3')
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [vectorType, setVectorType] = useState<string>('comprehensive')

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
      const response = await fetch('/api/bot-personality/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          similarity_threshold: threshold,
          vector_type: vectorType,
          include_bot_id: currentBotId // 只搜索当前机器人
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

      const data: VectorSearchResponse = await response.json()
      
      if (controller.signal.aborted) {
        return
      }
      
      setResults(data.results || [])
      console.log('人设向量检索结果:', data)
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

  // 向量类型选项
  const vectorTypeOptions = [
    { value: 'comprehensive', label: '综合向量' },
    { value: 'basic_info', label: '基础信息' },
    { value: 'personality', label: '性格特征' },
    { value: 'experiences', label: '人生经历' },
    { value: 'preferences', label: '生活偏好' },
    { value: 'dreams', label: '未来梦想' }
  ]

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
      <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100 flex items-center">
        <Search className="w-5 h-5 mr-2" />
        {botName || '机器人'}向量检索测试
      </h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex space-x-2">
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e)}
            onKeyPress={handleKeyPress}
            placeholder="输入检索查询，测试当前机器人的向量匹配效果..."
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
            <label className="text-sm text-gray-600 dark:text-gray-400">向量类型:</label>
            <select
              value={vectorType}
              onChange={(e) => setVectorType(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {vectorTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">相似度阈值:</label>
            <div className="flex flex-col">
              <Input
                type="text"
                value={thresholdInput}
                onChange={(e) => handleThresholdChange(e.target.value)}
                placeholder="0.3"
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
            {botName || '机器人'}向量匹配结果 ({results.length}):
          </h4>
          {results.map((result, index) => (
            <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {result.vector_type === 'basic_info' ? '基础信息' :
                     result.vector_type === 'personality' ? '性格特征' :
                     result.vector_type === 'experiences' ? '人生经历' :
                     result.vector_type === 'preferences' ? '生活偏好' :
                     result.vector_type === 'dreams' ? '未来梦想' :
                     '综合向量'}
                  </span>
                  {result.personality && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.personality.age && `${result.personality.age}岁`}
                      {result.personality.gender && ` • ${result.personality.gender}`}
                      {result.personality.nationality && ` • ${result.personality.nationality}`}
                      {result.personality.current_job && ` • ${result.personality.current_job}`}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {(result.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                {result.bot_name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content}
              </div>
              {result.personality?.values && (
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  价值观: {result.personality.values}
                </div>
              )}
              {result.personality?.hobbies && (
                <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                  兴趣爱好: {result.personality.hobbies}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : hasSearched && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {botName || '机器人'}的向量与查询&quot;{query}&quot;匹配度较低，尝试降低相似度阈值或使用更相关的查询词
          </p>
        </div>
      )}
    </div>
  )
}

// 获取分类标签（用于标签页）
const getCategoryLabel = (key: string, lang: Language = 'zh'): string => {
  return CATEGORY_LABELS[key]?.[lang] || key;
}

// 机器人卡片组件
interface BotCardProps {
  bot: BotPersonality
  onSelect: () => void
  isSelected: boolean
}

function BotCard({ bot, onSelect, isSelected }: BotCardProps) {
  return (
    <div className={`group relative bg-white dark:bg-[var(--component-background)] rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden ${
      isSelected 
        ? 'border-blue-500 dark:border-blue-400 neumorphic-inset bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-700/20'
    }`} onClick={onSelect}>
      <div className="p-3">
        <div className="flex items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {bot.bot_name}
            </h3>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BotsPage() {
  const [language, setLanguage] = useState<Language>('zh')
  const [personalities, setPersonalities] = useState<BotPersonality[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [currentBot, setCurrentBot] = useState<BotPersonality>({ bot_name: '' })
  const [images, setImages] = useState<Record<string, BotImage[]>>({
    personal: [],
    lifestyle: [],
    work: [],
    hobby: [],
    travel: []
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const [showVectorTest, setShowVectorTest] = useState(false)
  
  const [activeTab, setActiveTab] = useState<string>('basic_info')
  const [newBotName, setNewBotName] = useState('')

  const loadPersonalities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bot-personality')
      if (response.ok) {
        const data = await response.json()
        setPersonalities(data.personalities || [])
        
        // 如果有机器人且没有选中任何机器人，默认选中第一个
        if (data.personalities?.length > 0) {
          setSelectedBotId(prevId => prevId || data.personalities[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading personalities:', error)
    } finally {
      setLoading(false)
    }
  }, []);

  // 加载所有机器人
  useEffect(() => {
    loadPersonalities()
  }, [loadPersonalities])

  // 当选中机器人改变时，加载对应数据
  useEffect(() => {
    if (selectedBotId) {
      const bot = personalities.find(p => p.id === selectedBotId)
      if (bot) {
        setCurrentBot(bot)
        loadImages(selectedBotId)
      }
    }
  }, [selectedBotId, personalities])

  const loadImages = async (botId: string) => {
    try {
      const imageTypes = ['personal', 'lifestyle', 'work', 'hobby', 'travel']
      const imagePromises = imageTypes.map(async (type) => {
        const response = await fetch(`/api/bot-personality/images?bot_id=${botId}&image_type=${type}`)
        if (response.ok) {
          const data = await response.json()
          return { type, images: data.images || [] }
        }
        return { type, images: [] }
      })

      const results = await Promise.all(imagePromises)
      const newImages: Record<string, BotImage[]> = {}
      results.forEach(({ type, images: typeImages }) => {
        newImages[type] = typeImages
      })
      setImages(newImages)
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }

  // 创建新机器人
  const handleCreateBot = async () => {
    if (!newBotName.trim()) return

    try {
      const response = await fetch('/api/bot-personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bot_name: newBotName.trim(),
          language: language  // 传递当前语言
        })
      })

      if (response.ok) {
        const data = await response.json()
        await loadPersonalities()
        setSelectedBotId(data.personality.id)
        setShowCreateModal(false)
        setNewBotName('')
      }
    } catch (error) {
      console.error('Error creating bot:', error)
    }
  }

  // 删除机器人 - 改为软删除，支持乐观更新
  const handleDeleteBot = async () => {
    if (!deleteId) return

    // 保存原始状态用于错误回滚
    const originalPersonalities = [...personalities]
    
    // 乐观更新：立即从UI中移除
    setPersonalities(prev => prev.filter(p => p.id !== deleteId))
    
    // 如果删除的是当前选中的机器人，清空选中状态
    if (selectedBotId === deleteId) {
      setSelectedBotId('')
      setCurrentBot({ bot_name: '' })
    }
    
    // 关闭模态框
    setShowDeleteModal(false)
    const currentDeleteId = deleteId
    setDeleteId('')
    
    setDeleting(true)
    
    try {
      const response = await fetch(`/api/bot-personality?id=${currentDeleteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除操作失败')
      }

    } catch (error) {
      console.error('Error deleting bot:', error)
      
      // 失败时回滚状态
      setPersonalities(originalPersonalities)
      
      // 如果删除的是当前选中的机器人，恢复选中状态
      if (selectedBotId === currentDeleteId || !selectedBotId) {
        setSelectedBotId(currentDeleteId)
        const restoredBot = originalPersonalities.find(p => p.id === currentDeleteId)
        if (restoredBot) {
          setCurrentBot(restoredBot)
          await loadImages(currentDeleteId)
        }
      }
      
      // 重新打开删除模态框
      setDeleteId(currentDeleteId)
      setShowDeleteModal(true)
      
      alert('删除失败，请稍后重试')
    } finally {
      setDeleting(false)
    }
  }

  // 更新字段值
  const updateField = (fieldKey: string, value: unknown) => {
    setCurrentBot(prev => ({ ...prev, [fieldKey]: value }))
  }

  // 保存当前机器人数据 - 使用乐观更新
  const savePersonality = async () => {
    if (!currentBot.bot_name.trim() || !selectedBotId) return

    // 乐观更新：立即更新本地状态
    const optimisticBot = { ...currentBot, id: selectedBotId }
    const originalPersonalities = [...personalities]
    
    // 立即更新UI
    setPersonalities(prev => prev.map(p => p.id === selectedBotId ? optimisticBot : p))
    setSaving(true)

    try {
      const response = await fetch('/api/bot-personality', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...currentBot, 
          id: selectedBotId,
          language: language  // 传递当前语言
        })
      })

      if (response.ok) {
        // 成功后重新加载确保数据一致性
        await loadPersonalities()
      } else {
        // 失败时回滚状态
        setPersonalities(originalPersonalities)
        alert('保存失败，请稍后重试')
      }
    } catch (error) {
      console.error('Error saving personality:', error)
      // 失败时回滚状态
      setPersonalities(originalPersonalities)
      alert('保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-[var(--background)]">
      {/* 左侧机器人列表 - 调整宽度 */}
      <div className="w-40 bg-white dark:bg-[var(--component-background)] border-r border-gray-200 dark:border-[var(--border-color)] flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center justify-between mt-2 mb-2">
            <h2 className="text-m font-semibold text-gray-900 dark:text-gray-100">
              机器人列表
            </h2>
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="neumorphic bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {personalities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">暂无机器人</p>
              <p className="text-xs">点击&quot;+&quot;创建</p>
            </div>
          ) : (
            personalities.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                isSelected={selectedBotId === bot.id}
                onSelect={() => setSelectedBotId(bot.id!)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedBotId ? (
          <>
            {/* 顶部工具栏 */}
            <div className="bg-white dark:bg-[var(--component-background)] border-b border-gray-200 dark:border-[var(--border-color)] p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      {/* 向量检索按钮 */}
                      <div className="mb-3">
                        <Button
                          variant="secondary"
                          onClick={() => setShowVectorTest(!showVectorTest)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          {showVectorTest ? '隐藏' : '显示'}向量检索
                          <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${showVectorTest ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                      
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {currentBot.bot_name || '未命名机器人'}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        配置机器人的详细人格设定
                      </p>
                    </div>
                    
                    {/* 多语言切换和操作按钮 */}
                    <div className="flex items-center space-x-4">
                      <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden neumorphic-subtle">
                        <button
                          onClick={() => setLanguage('zh')}
                          className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                            language === 'zh' 
                              ? 'bg-blue-500 text-white shadow-inner' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          中文
                        </button>
                        <button
                          onClick={() => setLanguage('vi')}
                          className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                            language === 'vi' 
                              ? 'bg-blue-500 text-white shadow-inner' 
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          Tiếng Việt
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDeleteId(selectedBotId)
                            setShowDeleteModal(true)
                          }}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deleting ? '删除中...' : '删除'}
                        </Button>
                        
                        <Button
                          onClick={savePersonality}
                          disabled={saving || !currentBot.bot_name.trim()}
                          className="neumorphic bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg"
                        >
                          {saving ? '保存中...' : '保存更改'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 向量检索面板 */}
            {showVectorTest && (
              <div className="bg-white dark:bg-[var(--component-background)] border-b border-gray-200 dark:border-[var(--border-color)] px-6 py-4 flex-shrink-0">
                <VectorTestComponent currentBotId={selectedBotId} botName={currentBot.bot_name} />
              </div>
            )}

            {/* 标签页导航 */}
            <div className="bg-white dark:bg-[var(--component-background)] border-b border-gray-200 dark:border-[var(--border-color)] flex-shrink-0">
              <div className="px-6">
                <div className="flex space-x-1 overflow-x-auto">
                  {FORM_FIELD_GROUPS.map((group) => (
                    <button
                      key={group.category}
                      onClick={() => setActiveTab(group.category)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 relative ${
                        activeTab === group.category
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      {getCategoryLabel(group.category, language)}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveTab('images')}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center ${
                      activeTab === 'images'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="w-4 h-4 mr-2" />
                    {getCategoryLabel('images', language)}
                  </button>
                </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {activeTab === 'images' ? (
                  <div className="space-y-8">
                    {(['personal', 'lifestyle', 'work', 'hobby', 'travel'] as const).map((imageType) => (
                      <ImageUpload
                        key={imageType}
                        botId={selectedBotId}
                        imageType={imageType}
                        images={images[imageType] || []}
                        onImagesChange={(newImages) => {
                          setImages(prev => ({ ...prev, [imageType]: newImages }))
                        }}
                        language={language}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="max-w-4xl">
                    {FORM_FIELD_GROUPS
                      .filter(group => group.category === activeTab)
                      .map((group) => (
                        <div key={group.category} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {group.fields.map((fieldKey) => (
                              <div key={fieldKey} className={
                                ['current_address', 'current_job', 'work_address', 'education_background', 
                                 'marriage_history', 'hobbies', 'worldview', 'life_philosophy', 'values',
                                 'childhood_experience', 'childhood_stories', 'growth_experience',
                                 'relationship_experience', 'work_experience', 'business_experience',
                                 'investment_experience', 'places_to_visit', 'life_dreams', 'future_thoughts',
                                 'daily_routine', 'life_timeline', 'family_members'].includes(fieldKey)
                                ? 'md:col-span-2' : ''
                              }>
                                <PersonalityFormField
                                  fieldKey={fieldKey}
                                  value={currentBot[fieldKey as keyof BotPersonality]}
                                  onChange={(value) => updateField(fieldKey, value)}
                                  language={language}
                                  required={fieldKey === 'bot_name'}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-[var(--component-background)]">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 neumorphic-subtle">
                <BookOpen className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">选择机器人开始编辑</h3>
              <p className="text-sm">从左侧列表中选择机器人，或创建一个新的机器人</p>
            </div>
          </div>
        )}
      </div>

      {/* 创建机器人模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建新机器人"
      >
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateBot(); }}>
          <Input
            label="机器人名称"
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            placeholder="请输入机器人名称"
            required
          />
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={!newBotName.trim()} className="neumorphic">
              创建
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 编辑机器人模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑机器人名称"
      >
        <Form onSubmit={(e) => { e.preventDefault(); /* 这里可以添加编辑逻辑 */ }}>
          <Input
            label="机器人名称"
            value={currentBot.bot_name}
            onChange={(e) => setCurrentBot(prev => ({ ...prev, bot_name: e.target.value }))}
            placeholder="请输入机器人名称"
            required
          />
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              取消
            </Button>
            <Button type="submit" className="neumorphic">
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBot}
        title="删除机器人"
        message="确定要删除这个机器人吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </div>
  )
} 