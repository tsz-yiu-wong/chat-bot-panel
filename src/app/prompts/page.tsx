'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Bot, Tag } from 'lucide-react'
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

const stageOptions = [
  { value: 'first_meet', label: '处识', color: 'purple' },
  { value: 'learn_hobbies', label: '了解爱好', color: 'orange' },
  { value: 'build_intimacy', label: '加深感情', color: 'cyan' },
  { value: 'romance', label: '恋爱', color: 'pink' }
]

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

  // 表单状态
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    model_name: 'qwen3-32B',
    stage_name: 'first_meet',
    prompt_cn: '',
    prompt_vn: '',
    mark: ''
  })

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
      setFormData({
        id: '',
        name: '',
        model_name: 'qwen3-32B',
        stage_name: 'first_meet',
        prompt_cn: '',
        prompt_vn: '',
        mark: ''
      })
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
      setFormData({
        id: '',
        name: '',
        model_name: 'qwen3-32B',
        stage_name: 'first_meet',
        prompt_cn: '',
        prompt_vn: '',
        mark: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '编辑提示词失败')
    }
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
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
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
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[100%]">
                    {prompt.name}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                    getStageColor(prompt.stage_name) === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40' :
                    getStageColor(prompt.stage_name) === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/40' :
                    getStageColor(prompt.stage_name) === 'cyan' ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-900/40' :
                    getStageColor(prompt.stage_name) === 'pink' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-pink-900/40' :
                    'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                  }`}>
                    {getStageLabel(prompt.stage_name)}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="font-mono font-medium">{prompt.model_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 transition-opacity duration-200">
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
              <div className="px-6 pb-6 space-y-4">
                {/* 中文版本 */}
                <div>
                  <div className="bg-gray-50 dark:bg-[var(--accent-background)] rounded-xl p-4 border-l-3 border-blue-500">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
                      {prompt.prompt_cn}
                    </p>
                  </div>
                </div>

                {/* 越南文版本 */}
                <div>
                  <div className="bg-gray-50 dark:bg-[var(--accent-background)] rounded-xl p-4 border-l-3 border-emerald-500">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
                      {prompt.prompt_vn}
                    </p>
                  </div>
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">创建新提示词</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  提示词名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="qwen3-32B">qwen3-32B</option>
                    <option value="gemma3-27B">gemma3-27B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    聊天阶段
                  </label>
                  <select 
                    value={formData.stage_name}
                    onChange={(e) => setFormData({...formData, stage_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
                  placeholder='备注信息'
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white rounded-lg transition-colors"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑提示词模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">编辑提示词</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  提示词名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="为这个提示词输入一个有意义的名称"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="qwen3-32B">qwen3-32B</option>
                    <option value="gemma3-27B">gemma3-27B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    聊天阶段
                  </label>
                  <select 
                    value={formData.stage_name}
                    onChange={(e) => setFormData({...formData, stage_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
                  placeholder='备注信息'
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
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