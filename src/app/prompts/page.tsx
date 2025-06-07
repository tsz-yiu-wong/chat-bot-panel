'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Edit, Trash2, Bot, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// 类型定义
interface Prompt {
  id: string
  name: string
  model_name: string
  stage_name: string
  prompt_cn: string
  prompt_vn: string
  mark?: string
  created_at: string
  updated_at: string
}

// 默认表单数据
const DEFAULT_FORM_DATA = {
  id: '',
  name: '',
  model_name: 'qwen3-32B',
  stage_name: 'first_meet',
  prompt_cn: '',
  prompt_vn: '',
  mark: ''
}

// 阶段配置
const stageOptions = [
  { value: 'first_meet', label: '初识', color: 'purple' },
  { value: 'learn_hobbies', label: '了解爱好', color: 'orange' },
  { value: 'build_intimacy', label: '加深感情', color: 'cyan' },
  { value: 'romance', label: '恋爱', color: 'pink' }
]

// 模型配置
const modelOptions = [
  { value: 'qwen3-32B', label: 'qwen3-32B' },
  { value: 'gemma3-27B', label: 'gemma3-27B' }
]

// 颜色配置类型
type ColorName = 'purple' | 'orange' | 'cyan' | 'pink'
type ColorConfig = {
  [key in ColorName]: {
    light: {
      bg: string
      text: string
      border: string
      hover: string
    }
    dark: {
      bg: string
      text: string
      border: string
      hover: string
    }
    active: {
      bg: string
      text: string
      border: string
    }
  }
}

// 颜色配置
const colorConfig: ColorConfig = {
  purple: {
    light: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-100',
      hover: 'hover:bg-purple-100'
    },
    dark: {
      bg: 'dark:bg-purple-900/20',
      text: 'dark:text-purple-300',
      border: 'dark:border-purple-900/40',
      hover: 'dark:hover:bg-purple-900/30'
    },
    active: {
      bg: 'bg-purple-600',
      text: 'text-white',
      border: 'border-purple-600'
    }
  },
  orange: {
    light: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-100',
      hover: 'hover:bg-orange-100'
    },
    dark: {
      bg: 'dark:bg-orange-900/20',
      text: 'dark:text-orange-300',
      border: 'dark:border-orange-900/40',
      hover: 'dark:hover:bg-orange-900/30'
    },
    active: {
      bg: 'bg-orange-600',
      text: 'text-white',
      border: 'border-orange-600'
    }
  },
  cyan: {
    light: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-100',
      hover: 'hover:bg-cyan-100'
    },
    dark: {
      bg: 'dark:bg-cyan-900/20',
      text: 'dark:text-cyan-300',
      border: 'dark:border-cyan-900/40',
      hover: 'dark:hover:bg-cyan-900/30'
    },
    active: {
      bg: 'bg-cyan-600',
      text: 'text-white',
      border: 'border-cyan-600'
    }
  },
  pink: {
    light: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-100',
      hover: 'hover:bg-pink-100'
    },
    dark: {
      bg: 'dark:bg-pink-900/20',
      text: 'dark:text-pink-300',
      border: 'dark:border-pink-900/40',
      hover: 'dark:hover:bg-pink-900/30'
    },
    active: {
      bg: 'bg-pink-600',
      text: 'text-white',
      border: 'border-pink-600'
    }
  }
}

// 获取阶段颜色类名
const getStageColorClasses = (stageName: string, isActive: boolean) => {
  const stage = stageOptions.find(s => s.value === stageName)
  const color = stage?.color as ColorName || 'purple'
  const config = colorConfig[color]

  if (isActive) {
    return `${config.active.bg} ${config.active.text} ${config.active.border}`
  }

  return `${config.light.bg} ${config.light.text} ${config.light.border} ${config.light.hover} ${config.dark.bg} ${config.dark.text} ${config.dark.border} ${config.dark.hover}`
}

// 提示词内容组件
function PromptContent({ content, stageColor = 'gray' }: { 
  content: string, 
  stageColor?: string 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [shouldShowButton, setShouldShowButton] = useState(false)
  const [maxHeight, setMaxHeight] = useState<string>('none')
  
  // 获取边框颜色
  const getBorderColorClass = () => {
    switch(stageColor) {
      case 'purple': return 'border-purple-500 dark:border-purple-400'
      case 'orange': return 'border-orange-500 dark:border-orange-400'
      case 'cyan': return 'border-cyan-500 dark:border-cyan-400'
      case 'pink': return 'border-pink-500 dark:border-pink-400'
      default: return 'border-gray-500 dark:border-gray-400'
    }
  }

  // 获取渐变颜色 - 修复深色模式渐变效果
  const getGradientFromColor = () => {
    // 浅色模式：根据阶段颜色生成对应的渐变效果
    // 深色模式：统一使用背景色渐变，确保文字逐渐消失的效果
    const lightGradient = (() => {
      switch(stageColor) {
        case 'purple': return 'from-purple-50 via-purple-50/80 to-purple-50/0'
        case 'orange': return 'from-orange-50 via-orange-50/80 to-orange-50/0'
        case 'cyan': return 'from-cyan-50 via-cyan-50/80 to-cyan-50/0'
        case 'pink': return 'from-pink-50 via-pink-50/80 to-pink-50/0'
        default: return 'from-gray-50 via-gray-50/80 to-gray-50/0'
      }
    })()
    
    // 深色模式统一使用背景色渐变，与内容区域背景一致
    const darkGradient = 'dark:from-[var(--accent-background)] dark:via-[var(--accent-background)]/80 dark:to-[var(--accent-background)]/0'
    
    return `${lightGradient} ${darkGradient}`
  }

  // 检查内容高度是否超过阈值
  const checkHeight = useCallback(() => {
    if (contentRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight)
      const defaultMaxHeight = lineHeight * 5 // 5行的高度
      const scrollHeight = contentRef.current.scrollHeight
      setShouldShowButton(scrollHeight > defaultMaxHeight)
      setMaxHeight(isExpanded ? `${scrollHeight}px` : `${defaultMaxHeight}px`)
    }
  }, [isExpanded])

  // 监听内容变化和展开状态变化
  useEffect(() => {
    checkHeight()
    window.addEventListener('resize', checkHeight)
    return () => window.removeEventListener('resize', checkHeight)
  }, [content, checkHeight, isExpanded])

  return (
    <div className="relative">
      <div 
        ref={contentRef}
        style={{ maxHeight }}
        className={`bg-gray-50 dark:bg-[var(--accent-background)] rounded-xl p-4 border-l-3 ${getBorderColorClass()} transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
          {content}
        </p>
        
        {/* 渐变遮罩 - 修复深色模式效果 */}
        {shouldShowButton && !isExpanded && (
          <div 
            className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${getGradientFromColor()} pointer-events-none transition-opacity duration-300`}
          />
        )}
      </div>
      
      {/* 展开/收起按钮 */}
      {shouldShowButton && (
        <div 
          className={`absolute left-0 right-0 flex justify-center transition-all duration-300 ${
            isExpanded ? '-mb-4 bottom-2' : '-mb-4 bottom-0'
          }`}
        >
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-[1px] bg-gray-200 dark:bg-gray-700" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="relative flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-[var(--component-background)] rounded-full shadow-sm border border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 group hover:shadow hover:-translate-y-[1px]"
            >
              {isExpanded ? (
                <>
                  收起
                  <ChevronUp className="w-3 h-3 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </>
              ) : (
                <>
                  展开
                  <ChevronDown className="w-3 h-3 transition-transform duration-200 group-hover:translate-y-0.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 通用样式配置
const styles = {
  button: {
    primary: 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[var(--accent-background)] dark:hover:bg-[var(--border-color)] dark:text-gray-300',
  },
  modal: {
    background: 'bg-white dark:bg-[var(--component-background)]', // 表单背景色改为与输入框一致
    border: 'border border-gray-200 dark:border-[var(--border-color)]'
  },
  input: {
    base: 'w-full px-3 py-2 rounded-lg transition-colors duration-150',
    border: 'border border-gray-200 dark:border-[var(--border-color)] focus:border-blue-500 dark:focus:border-blue-400',
    background: 'bg-gray-50 dark:bg-[var(--background)]', // 输入框背景色改为与表单原来的颜色
    text: 'text-gray-900 dark:text-gray-100',
    placeholder: 'placeholder-gray-500 dark:placeholder-gray-400',
    focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20',
  }
}

// 获取输入框样式
const getInputClasses = (isTextArea = false) => {
  return `${styles.input.base} ${styles.input.border} ${styles.input.background} ${styles.input.text} ${styles.input.placeholder} ${styles.input.focus} ${isTextArea ? 'font-mono text-sm whitespace-pre-wrap' : ''}`
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedModel, setSelectedModel] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string>('')
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)

  // 加载提示词数据
  useEffect(() => {
    fetchPrompts()
  }, [])

  async function fetchPrompts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPrompts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载提示词失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建新提示词
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('prompts')
        .insert([{
          name: formData.name,
          model_name: formData.model_name,
          stage_name: formData.stage_name,
          prompt_cn: formData.prompt_cn,
          prompt_vn: formData.prompt_vn,
          mark: formData.mark
        }])
        .select()

      if (error) throw error

      setPrompts([...(data || []), ...prompts])
      setShowCreateModal(false)
      setFormData(DEFAULT_FORM_DATA)
    } catch (err) {
      console.error('Error creating prompt:', err)
      setError(err instanceof Error ? err.message : '创建提示词失败')
    }
  }

  // 删除提示词
  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPrompts(prompts.filter(p => p.id !== id))
      setShowDeleteModal(false)
      setDeleteId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除提示词失败')
    }
  }

  // 编辑提示词
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('prompts')
        .update({
          name: formData.name,
          model_name: formData.model_name,
          stage_name: formData.stage_name,
          prompt_cn: formData.prompt_cn,
          prompt_vn: formData.prompt_vn,
          mark: formData.mark
        })
        .eq('id', formData.id)
        .select()

      if (error) throw error

      setPrompts(prompts.map(p => p.id === formData.id ? (data?.[0] ?? p) : p))
      setShowEditModal(false)
      setFormData(DEFAULT_FORM_DATA)
    } catch (err) {
      setError(err instanceof Error ? err.message : '编辑提示词失败')
    }
  }

  // 打开创建模态框
  function handleOpenCreateModal() {
    setFormData(DEFAULT_FORM_DATA) // 重置表单数据
    setShowCreateModal(true)
  }

  // 打开编辑模态框
  function handleEditClick(prompt: Prompt) {
    setFormData({
      id: prompt.id,
      name: prompt.name,
      model_name: prompt.model_name,
      stage_name: prompt.stage_name,
      prompt_cn: prompt.prompt_cn,
      prompt_vn: prompt.prompt_vn,
      mark: prompt.mark || ''
    })
    setShowEditModal(true)
  }

  // 关闭模态框时重置表单
  function handleCloseModal() {
    setFormData(DEFAULT_FORM_DATA)
    setShowCreateModal(false)
    setShowEditModal(false)
  }

  // 打开删除确认框
  function handleDeleteClick(id: string) {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const filteredPrompts = prompts.filter(prompt => {
    const stageMatch = selectedStage === 'all' || prompt.stage_name === selectedStage
    const modelMatch = selectedModel === 'all' || prompt.model_name === selectedModel
    return stageMatch && modelMatch
  })

  const getStageColor = (stageName: string) => {
    const stage = stageOptions.find(s => s.value === stageName)
    return stage?.color || 'gray'
  }

  const getStageLabel = (stageName: string) => {
    const stage = stageOptions.find(s => s.value === stageName)
    return stage?.label || stageName
  }

  if (loading) return <div className="p-6">加载中...</div>
  if (error) return <div className="p-6 text-red-500">错误: {error}</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">系统提示词</h1>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className={`${styles.button.primary} px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors`}
        >
          <Plus className="w-4 h-4" />
          <span>创建提示词</span>
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-[var(--component-background)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--border-color)] p-6 mb-6">
        <div className="space-y-4">
          {/* 阶段筛选 */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              阶段：
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStage('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  selectedStage === 'all'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'bg-white dark:bg-[var(--component-background)] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                全部 ({prompts.length})
              </button>
              {stageOptions.map(stage => {
                const count = prompts.filter(p => p.stage_name === stage.value).length
                return (
                  <button
                    key={stage.value}
                    onClick={() => setSelectedStage(stage.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                      selectedStage === stage.value
                        ? stage.color === 'purple' ? 'bg-purple-600 text-white border-purple-600' :
                          stage.color === 'orange' ? 'bg-orange-600 text-white border-orange-600' :
                          stage.color === 'cyan' ? 'bg-cyan-600 text-white border-cyan-600' :
                          stage.color === 'pink' ? 'bg-pink-600 text-white border-pink-600' :
                          'bg-gray-600 text-white border-gray-600'
                        : stage.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/30' :
                          stage.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-900/40 hover:bg-orange-100 dark:hover:bg-orange-900/30' :
                          stage.color === 'cyan' ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-900/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/30' :
                          stage.color === 'pink' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/40 hover:bg-pink-100 dark:hover:bg-pink-900/30' :
                          'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {stage.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* 模型筛选 */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              模型：
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedModel('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  selectedModel === 'all'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'bg-white dark:bg-[var(--component-background)] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[var(--border-color)] hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                全部 ({prompts.length})
              </button>
              {['qwen3-32B', 'gemma3-27B'].map(model => {
                const count = prompts.filter(p => p.model_name === model).length
                return (
                  <button
                    key={model}
                    onClick={() => setSelectedModel(model)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                      selectedModel === model
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Bot className="w-3 h-3" />
                      <span>{model}</span>
                      <span className="opacity-75">({count})</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 提示词列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            提示词列表
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            共 {filteredPrompts.length} 条
          </span>
        </div>
        
        <div className="grid gap-4">
          {filteredPrompts.map((prompt) => (
            <div 
              key={prompt.id} 
              className="group bg-white dark:bg-[var(--component-background)] rounded-2xl border border-gray-100 dark:border-[var(--border-color)] hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md"
            >
              {/* 头部信息 */}
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0 mr-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[100%]">
                    {prompt.name}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                    getStageColorClasses(prompt.stage_name, false)
                  }`}>
                    {getStageLabel(prompt.stage_name)}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="font-mono font-medium">{prompt.model_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 transition-opacity duration-200 flex-shrink-0">
                  <button 
                    onClick={() => handleEditClick(prompt)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(prompt.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* 内容区域 */}
              <div className="px-6 pb-6 space-y-6">
                {/* 中文版本 */}
                <div>
                  <PromptContent 
                    content={prompt.prompt_cn} 
                    stageColor={getStageColor(prompt.stage_name)}
                  />
                </div>

                {/* 越南文版本 */}
                <div>
                  <PromptContent 
                    content={prompt.prompt_vn} 
                    stageColor={getStageColor(prompt.stage_name)}
                  />
                </div>

                {/* 备注 */}
                {prompt.mark && (
                  <div className="flex items-start space-x-3 pt-2 border-t border-gray-100 dark:border-[var(--border-color)]">
                    <div className="flex items-center h-6">
                      <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                        {prompt.mark}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无提示词</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {selectedStage !== 'all' || selectedModel !== 'all' 
                  ? '当前筛选条件下没有找到匹配的提示词' 
                  : '还没有创建任何提示词，点击上方按钮开始创建'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 创建提示词模态框 */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`${styles.modal.background} ${styles.modal.border} rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 sticky top-0 ${styles.modal.background} border-b border-gray-200 dark:border-[var(--border-color)] pb-4 -mx-6 px-6 -mt-6 pt-6 z-10`}>
                {showCreateModal ? '创建新提示词' : '编辑提示词'}
              </h3>
              
              <form onSubmit={showCreateModal ? handleCreate : handleEdit} className="space-y-5 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    提示词名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className={getInputClasses()}
                    placeholder="给提示词取个名字"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      关联模型
                    </label>
                    <select 
                      value={formData.model_name}
                      onChange={(e) => setFormData({...formData, model_name: e.target.value})}
                      className={getInputClasses()}
                    >
                      {modelOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      聊天阶段
                    </label>
                    <select 
                      value={formData.stage_name}
                      onChange={(e) => setFormData({...formData, stage_name: e.target.value})}
                      className={getInputClasses()}
                    >
                      {stageOptions.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    中文提示词模板
                  </label>
                  <textarea
                    value={formData.prompt_cn}
                    onChange={(e) => setFormData({...formData, prompt_cn: e.target.value})}
                    rows={4}
                    className={getInputClasses(true)}
                    placeholder="输入中文提示词模板"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    越南语提示词模板
                  </label>
                  <textarea
                    value={formData.prompt_vn}
                    onChange={(e) => setFormData({...formData, prompt_vn: e.target.value})}
                    rows={4}
                    className={getInputClasses(true)}
                    placeholder="Nhập mẫu prompt tiếng Việt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    备注
                  </label>
                  <textarea
                    value={formData.mark}
                    onChange={(e) => setFormData({...formData, mark: e.target.value})}
                    rows={3}
                    className={getInputClasses(true)}
                    placeholder="备注信息"
                  />
                </div>

                <div className={`flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-[var(--border-color)]`}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={`${styles.button.secondary} px-4 py-2 rounded-lg transition-colors duration-150`}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button.primary} px-4 py-2 rounded-lg transition-colors duration-150`}
                  >
                    {showCreateModal ? '创建' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这个提示词吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteId('')
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 