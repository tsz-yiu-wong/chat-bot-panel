'use client'

import { useState, useEffect } from 'react'
import { Plus, BookOpen, MessageSquare, Trash2, Edit, ChevronDown } from 'lucide-react'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Form, Input, Textarea } from '@/components/ui/form'
import { SearchBox } from '@/components/ui/search-box'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading'
import { VectorTestComponent } from './test-vector'
import { supabase } from '@/lib/supabase'
import { updateKnowledgeVectors, deleteKnowledgeVectors } from '@/lib/vector'

// 类型定义
interface Abbreviation {
  id: string
  category: string
  abbreviation: string
  full_form: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ConversationScript {
  id: string
  scenario: string
  text: string
  answer: string
  created_at: string
  updated_at: string
}

interface CategoryOption {
  value: string
  label: string
  count?: number
}

// 自定义Select组件 - 支持添加新选项
interface CustomSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  allowAdd?: boolean
  addLabel?: string
  onAddNew?: (newValue: string) => void
}

function CustomSelect({ label, value, onChange, options, required, placeholder, allowAdd, addLabel, onAddNew }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const selectedOption = options.find(opt => opt.value === value)

  const handleAddNew = () => {
    if (newValue.trim() && onAddNew) {
      onAddNew(newValue.trim())
      onChange(newValue.trim())
      setNewValue('')
      setIsAdding(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 rounded-lg transition-colors duration-150 border border-gray-200 dark:border-[var(--border-color)] focus:border-blue-500 dark:focus:border-blue-400 bg-gray-50 dark:bg-[var(--background)] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 flex items-center justify-between"
        >
          <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
            {selectedOption?.label || placeholder || '请选择...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => {
                setIsOpen(false)
                setIsAdding(false)
                setNewValue('')
              }}
            />
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-[var(--component-background)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {!isAdding ? (
                <>
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                        value === option.value 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  {allowAdd && (
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="w-full px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 border-t border-gray-200 dark:border-gray-600 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addLabel || '添加新选项'}</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="p-3">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={addLabel || '输入新选项'}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-[var(--background)] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 mb-2"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNew()
                      }
                    }}
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleAddNew}
                      disabled={!newValue.trim()}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      添加
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false)
                        setNewValue('')
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-150"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 默认分类配置
const DEFAULT_ABBREVIATION_CATEGORIES = [
  '其他'
]

const DEFAULT_CONVERSATION_SCENARIOS = [
  '其他'
]

// 默认表单数据
const DEFAULT_ABBREVIATION_FORM = {
  id: '',
  category: '其他',
  abbreviation: '',
  full_form: '',
  description: ''
}

const DEFAULT_SCRIPT_FORM = {
  id: '',
  scenario: '其他',
  text: '',
  answer: ''
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'abbreviations' | 'scripts'>('abbreviations')
  const [abbreviations, setAbbreviations] = useState<Abbreviation[]>([])
  const [scripts, setScripts] = useState<ConversationScript[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // 动态分类状态
  const [abbreviationCategories, setAbbreviationCategories] = useState<string[]>(DEFAULT_ABBREVIATION_CATEGORIES)
  const [scriptScenarios, setScriptScenarios] = useState<string[]>(DEFAULT_CONVERSATION_SCENARIOS)
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(false)
  
  // 表单状态
  const [abbreviationForm, setAbbreviationForm] = useState(DEFAULT_ABBREVIATION_FORM)
  const [scriptForm, setScriptForm] = useState(DEFAULT_SCRIPT_FORM)
  const [editCategoryForm, setEditCategoryForm] = useState({ oldName: '', newName: '' })

  // 加载数据和动态分类
  useEffect(() => {
    if (activeTab === 'abbreviations') {
      fetchAbbreviations()
    } else {
      fetchScripts()
    }
  }, [activeTab])

  // 动态获取分类选项
  const getCategoryOptions = (): CategoryOption[] => {
    const currentData = activeTab === 'abbreviations' ? abbreviations : scripts
    const currentCategories = activeTab === 'abbreviations' ? abbreviationCategories : scriptScenarios
    const fieldName = activeTab === 'abbreviations' ? 'category' : 'scenario'
    
    // 过滤掉"其他"并按首字母排序
    const sortedCategories = currentCategories
      .filter(category => category !== '其他')
      .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
    
    // 如果存在"其他"分类，将其添加到末尾
    const finalCategories = currentCategories.includes('其他') 
      ? [...sortedCategories, '其他']
      : sortedCategories
    
    return finalCategories.map(category => {
      const count = currentData.filter(item => {
        if (fieldName === 'category' && 'category' in item) {
          return item.category === category
        }
        if (fieldName === 'scenario' && 'scenario' in item) {
          return item.scenario === category
        }
        return false
      }).length
      return {
        value: category,
        label: category,
        count
      }
    })
  }

  // 获取表单选项
  const getFormOptions = () => {
    const categories = activeTab === 'abbreviations' ? abbreviationCategories : scriptScenarios
    return categories.map(cat => ({ value: cat, label: cat }))
  }

  // 添加新分类到列表（确保"其他"始终在最后）
  const addNewCategory = (newCategory: string) => {
    if (activeTab === 'abbreviations') {
      if (!abbreviationCategories.includes(newCategory)) {
        const allCategories = [...abbreviationCategories, newCategory]
        const sortedCategories = allCategories
          .filter(cat => cat !== '其他')
          .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
        
        setAbbreviationCategories([...sortedCategories, '其他'])
      }
    } else {
      if (!scriptScenarios.includes(newCategory)) {
        const allScenarios = [...scriptScenarios, newCategory]
        const sortedScenarios = allScenarios
          .filter(sc => sc !== '其他')
          .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
        
        setScriptScenarios([...sortedScenarios, '其他'])
      }
    }
  }

  async function fetchAbbreviations() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('knowledge_abbreviations')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAbbreviations(data || [])
      
      // 动态更新分类 - 按首字母排序，确保"其他"始终在最后
      const categories = [...new Set(data?.map(item => item.category) || [])]
      const sortedCategories = categories
        .filter(cat => cat !== '其他')
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      
      const finalCategories = categories.includes('其他') 
        ? [...sortedCategories, '其他']
        : [...sortedCategories, '其他']
      
      setAbbreviationCategories(finalCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载缩写库失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchScripts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('knowledge_scripts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setScripts(data || [])
      
      // 动态更新场景 - 按首字母排序，确保"其他"始终在最后
      const scenarios = [...new Set(data?.map(item => item.scenario) || [])]
      const sortedScenarios = scenarios
        .filter(sc => sc !== '其他')
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      
      const finalScenarios = scenarios.includes('其他') 
        ? [...sortedScenarios, '其他']
        : [...sortedScenarios, '其他']
      
      setScriptScenarios(finalScenarios)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载话术库失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建缩写
  async function handleCreateAbbreviation(e: React.FormEvent) {
    e.preventDefault()
    
    // 生成临时ID用于乐观更新
    const tempId = `temp-${Date.now()}`
    const optimisticAbbreviation: Abbreviation = {
      id: tempId,
      category: abbreviationForm.category,
      abbreviation: abbreviationForm.abbreviation,
      full_form: abbreviationForm.full_form,
      description: abbreviationForm.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // 保存原始状态用于错误回滚
    const originalAbbreviations = [...abbreviations]
    const originalCategories = [...abbreviationCategories]
    
    // 乐观更新：立即更新UI
    setAbbreviations([optimisticAbbreviation, ...abbreviations])
    
    // 如果是新分类，立即更新分类列表
    const isNewCategory = !abbreviationCategories.includes(abbreviationForm.category)
    if (isNewCategory) {
      const filteredCategories = abbreviationCategories.filter(cat => cat !== '其他')
      const sortedCategories = [...filteredCategories, abbreviationForm.category]
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      setAbbreviationCategories([...sortedCategories, '其他'])
    }
    
    // 关闭模态框并重置表单
    setShowCreateModal(false)
    setAbbreviationForm(DEFAULT_ABBREVIATION_FORM)

    try {
      const { data, error } = await supabase
        .from('knowledge_abbreviations')
        .insert([{
          category: abbreviationForm.category,
          abbreviation: abbreviationForm.abbreviation,
          full_form: abbreviationForm.full_form,
          description: abbreviationForm.description || null
        }])
        .select()

      if (error) throw error

      if (data?.[0]) {
        // 替换临时记录为真实记录
        setAbbreviations(prev => prev.map(a => a.id === tempId ? data[0] : a))
        
        // 异步更新向量 - 利用数据库触发器 + OpenAI API
        try {
          await updateKnowledgeVectors(
            data[0].id,
            'abbreviation',
            {
              abbreviation: abbreviationForm.abbreviation,
              full_form: abbreviationForm.full_form,
              description: abbreviationForm.description,
              category: abbreviationForm.category
            }
          )
        } catch (vectorError) {
          console.error('Vector storage failed:', vectorError)
        }
      }
    } catch (err) {
      // 失败时回滚状态
      setAbbreviations(originalAbbreviations)
      if (isNewCategory) {
        setAbbreviationCategories(originalCategories)
      }
      setError(err instanceof Error ? err.message : '创建缩写失败')
      
      // 重新打开模态框并恢复表单数据
      setAbbreviationForm({
        id: '',
        category: optimisticAbbreviation.category,
        abbreviation: optimisticAbbreviation.abbreviation,
        full_form: optimisticAbbreviation.full_form,
        description: optimisticAbbreviation.description || ''
      })
      setShowCreateModal(true)
    }
  }

  // 创建话术
  async function handleCreateScript(e: React.FormEvent) {
    e.preventDefault()
    
    // 生成临时ID用于乐观更新
    const tempId = `temp-${Date.now()}`
    const optimisticScript: ConversationScript = {
      id: tempId,
      scenario: scriptForm.scenario,
      text: scriptForm.text,
      answer: scriptForm.answer,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // 保存原始状态用于错误回滚
    const originalScripts = [...scripts]
    const originalScenarios = [...scriptScenarios]
    
    // 乐观更新：立即更新UI
    setScripts([optimisticScript, ...scripts])
    
    // 如果是新场景，立即更新场景列表
    const isNewScenario = !scriptScenarios.includes(scriptForm.scenario)
    if (isNewScenario) {
      const filteredScenarios = scriptScenarios.filter(sc => sc !== '其他')
      const sortedScenarios = [...filteredScenarios, scriptForm.scenario]
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      setScriptScenarios([...sortedScenarios, '其他'])
    }
    
    // 关闭模态框并重置表单
    setShowCreateModal(false)
    setScriptForm(DEFAULT_SCRIPT_FORM)

    try {
      const { data, error } = await supabase
        .from('knowledge_scripts')
        .insert([{
          scenario: scriptForm.scenario,
          text: scriptForm.text,
          answer: scriptForm.answer
        }])
        .select()

      if (error) throw error

      if (data?.[0]) {
        // 替换临时记录为真实记录
        setScripts(prev => prev.map(s => s.id === tempId ? data[0] : s))
        
        // 异步更新向量 - 利用数据库触发器 + OpenAI API
        try {
          await updateKnowledgeVectors(
            data[0].id,
            'script',
            {
              scenario: scriptForm.scenario,
              text: scriptForm.text,
              answer: scriptForm.answer
            }
          )
        } catch (vectorError) {
          console.error('Vector storage failed:', vectorError)
        }
      }
    } catch (err) {
      // 失败时回滚状态
      setScripts(originalScripts)
      if (isNewScenario) {
        setScriptScenarios(originalScenarios)
      }
      setError(err instanceof Error ? err.message : '创建话术失败')
      
      // 重新打开模态框并恢复表单数据
      setScriptForm({
        id: '',
        scenario: optimisticScript.scenario,
        text: optimisticScript.text,
        answer: optimisticScript.answer
      })
      setShowCreateModal(true)
    }
  }

  // 编辑缩写
  async function handleEditAbbreviation(e: React.FormEvent) {
    e.preventDefault()
    
    // 乐观更新：立即更新本地状态
    const optimisticAbbreviation = {
      ...abbreviations.find(a => a.id === abbreviationForm.id)!,
      category: abbreviationForm.category,
      abbreviation: abbreviationForm.abbreviation,
      full_form: abbreviationForm.full_form,
      description: abbreviationForm.description || null,
      updated_at: new Date().toISOString()
    }
    const originalAbbreviations = [...abbreviations]
    
    // 立即更新UI
    setAbbreviations(abbreviations.map(a => a.id === abbreviationForm.id ? optimisticAbbreviation : a))
    
    // 如果是新分类，立即更新分类列表
    const isNewCategory = !abbreviationCategories.includes(abbreviationForm.category)
    const originalCategories = [...abbreviationCategories]
    if (isNewCategory) {
      const filteredCategories = abbreviationCategories.filter(cat => cat !== '其他')
      const sortedCategories = [...filteredCategories, abbreviationForm.category]
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      setAbbreviationCategories([...sortedCategories, '其他'])
    }
    
    // 关闭模态框
    setShowEditModal(false)
    setAbbreviationForm(DEFAULT_ABBREVIATION_FORM)

    try {
      const { data, error } = await supabase
        .from('knowledge_abbreviations')
        .update({
          category: abbreviationForm.category,
          abbreviation: abbreviationForm.abbreviation,
          full_form: abbreviationForm.full_form,
          description: abbreviationForm.description || null
        })
        .eq('id', abbreviationForm.id)
        .select()

      if (error) throw error

      if (data?.[0]) {
        // 更新所有相关向量 - 数据库触发器会重新生成向量记录，我们需要更新embedding
        try {
          await updateKnowledgeVectors(
            data[0].id,
            'abbreviation',
            {
              abbreviation: abbreviationForm.abbreviation,
              full_form: abbreviationForm.full_form,
              description: abbreviationForm.description,
              category: abbreviationForm.category
            }
          )
        } catch (vectorError) {
          console.error('Vector update failed:', vectorError)
        }
        
        // 成功后更新为真实数据
        setAbbreviations(abbreviations.map(a => a.id === abbreviationForm.id ? data[0] : a))
      }
    } catch (err) {
      // 失败时回滚状态
      setAbbreviations(originalAbbreviations)
      if (isNewCategory) {
        setAbbreviationCategories(originalCategories)
      }
      setError(err instanceof Error ? err.message : '编辑缩写失败')
      // 重新打开模态框
      setAbbreviationForm({
        id: optimisticAbbreviation.id,
        category: optimisticAbbreviation.category,
        abbreviation: optimisticAbbreviation.abbreviation,
        full_form: optimisticAbbreviation.full_form,
        description: optimisticAbbreviation.description || ''
      })
      setShowEditModal(true)
    }
  }

  // 编辑话术
  async function handleEditScript(e: React.FormEvent) {
    e.preventDefault()
    
    // 乐观更新：立即更新本地状态
    const optimisticScript = {
      ...scripts.find(s => s.id === scriptForm.id)!,
      scenario: scriptForm.scenario,
      text: scriptForm.text,
      answer: scriptForm.answer,
      updated_at: new Date().toISOString()
    }
    const originalScripts = [...scripts]
    
    // 立即更新UI
    setScripts(scripts.map(s => s.id === scriptForm.id ? optimisticScript : s))
    
    // 如果是新场景，立即更新场景列表
    const isNewScenario = !scriptScenarios.includes(scriptForm.scenario)
    const originalScenarios = [...scriptScenarios]
    if (isNewScenario) {
      const filteredScenarios = scriptScenarios.filter(sc => sc !== '其他')
      const sortedScenarios = [...filteredScenarios, scriptForm.scenario]
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
      setScriptScenarios([...sortedScenarios, '其他'])
    }
    
    // 关闭模态框
    setShowEditModal(false)
    setScriptForm(DEFAULT_SCRIPT_FORM)

    try {
      const { data, error } = await supabase
        .from('knowledge_scripts')
        .update({
          scenario: scriptForm.scenario,
          text: scriptForm.text,
          answer: scriptForm.answer
        })
        .eq('id', scriptForm.id)
        .select()

      if (error) throw error

      if (data?.[0]) {
        // 更新所有相关向量 - 数据库触发器会重新生成向量记录，我们需要更新embedding
        try {
          await updateKnowledgeVectors(
            data[0].id,
            'script',
            {
              scenario: scriptForm.scenario,
              text: scriptForm.text,
              answer: scriptForm.answer
            }
          )
        } catch (vectorError) {
          console.error('Vector update failed:', vectorError)
        }
        
        // 成功后更新为真实数据
        setScripts(scripts.map(s => s.id === scriptForm.id ? data[0] : s))
      }
    } catch (err) {
      // 失败时回滚状态
      setScripts(originalScripts)
      if (isNewScenario) {
        setScriptScenarios(originalScenarios)
      }
      setError(err instanceof Error ? err.message : '编辑话术失败')
      // 重新打开模态框
      setScriptForm({
        id: optimisticScript.id,
        scenario: optimisticScript.scenario,
        text: optimisticScript.text,
        answer: optimisticScript.answer
      })
      setShowEditModal(true)
    }
  }

  // 删除处理 - 改为软删除
  async function handleDelete() {
    setDeleting(true)
    
    // 乐观更新：立即从UI中移除
    const originalAbbreviations = [...abbreviations]
    const originalScripts = [...scripts]
    
    if (activeTab === 'abbreviations') {
      setAbbreviations(abbreviations.filter(a => a.id !== deleteId))
    } else {
      setScripts(scripts.filter(s => s.id !== deleteId))
    }
    
    // 关闭模态框
    setShowDeleteModal(false)
    const currentDeleteId = deleteId
    setDeleteId('')
    
    try {
      if (activeTab === 'abbreviations') {
        // 软删除缩写记录
        const { error } = await supabase
          .from('knowledge_abbreviations')
          .update({ is_deleted: true })
          .eq('id', currentDeleteId)

        if (error) throw error
        
        // 删除所有相关向量 - 硬删除向量数据
        try {
          await deleteKnowledgeVectors(currentDeleteId, 'abbreviation')
        } catch (vectorError) {
          console.error('Vector deletion failed:', vectorError)
          // 向量删除失败不影响主要删除操作
        }
      } else {
        // 软删除话术记录
        const { error } = await supabase
          .from('knowledge_scripts')
          .update({ is_deleted: true })
          .eq('id', currentDeleteId)

        if (error) throw error
        
        // 删除所有相关向量 - 硬删除向量数据
        try {
          await deleteKnowledgeVectors(currentDeleteId, 'script')
        } catch (vectorError) {
          console.error('Vector deletion failed:', vectorError)
          // 向量删除失败不影响主要删除操作
        }
      }
    } catch (err) {
      // 失败时回滚状态
      if (activeTab === 'abbreviations') {
        setAbbreviations(originalAbbreviations)
      } else {
        setScripts(originalScripts)
      }
      setError(err instanceof Error ? err.message : '删除失败')
      
      // 重新打开删除模态框
      setDeleteId(currentDeleteId)
      setShowDeleteModal(true)
    } finally {
      setDeleting(false)
    }
  }

  // 筛选数据
  const filteredAbbreviations = abbreviations
    .filter(abbr => {
      const categoryMatch = selectedCategory === 'all' || abbr.category === selectedCategory
      const searchMatch = !searchTerm || 
        abbr.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        abbr.full_form.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (abbr.description && abbr.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return categoryMatch && searchMatch
    })
    .sort((a, b) => {
      // 特殊处理："其他"分类始终排在最后
      if (a.category === '其他' && b.category !== '其他') return 1
      if (b.category === '其他' && a.category !== '其他') return -1
      
      // 首先按分类排序
      const categoryCompare = a.category.localeCompare(b.category, 'zh-CN', { sensitivity: 'accent' })
      if (categoryCompare !== 0) return categoryCompare
      
      // 分类相同时，按缩写排序
      return a.abbreviation.localeCompare(b.abbreviation, 'zh-CN', { sensitivity: 'accent' })
    })

  const filteredScripts = scripts
    .filter(script => {
      const categoryMatch = selectedCategory === 'all' || script.scenario === selectedCategory
      const searchMatch = !searchTerm || 
        script.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.answer.toLowerCase().includes(searchTerm.toLowerCase())
      return categoryMatch && searchMatch
    })
    .sort((a, b) => {
      // 特殊处理："其他"场景始终排在最后
      if (a.scenario === '其他' && b.scenario !== '其他') return 1
      if (b.scenario === '其他' && a.scenario !== '其他') return -1
      
      // 首先按场景排序
      const scenarioCompare = a.scenario.localeCompare(b.scenario, 'zh-CN', { sensitivity: 'accent' })
      if (scenarioCompare !== 0) return scenarioCompare
      
      // 场景相同时，按用户对话内容排序
      return a.text.localeCompare(b.text, 'zh-CN', { sensitivity: 'accent' })
    })

  const openCreateModal = () => {
    if (activeTab === 'abbreviations') {
      setAbbreviationForm(DEFAULT_ABBREVIATION_FORM)
    } else {
      setScriptForm(DEFAULT_SCRIPT_FORM)
    }
    setShowCreateModal(true)
  }

  const openEditModal = (item: Abbreviation | ConversationScript) => {
    if (activeTab === 'abbreviations') {
      const abbr = item as Abbreviation
      setAbbreviationForm({
        ...abbr,
        description: abbr.description || ''
      })
    } else {
      setScriptForm(item as ConversationScript)
    }
    setShowEditModal(true)
  }

  // 编辑分类名称
  async function handleEditCategory(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { oldName, newName } = editCategoryForm
      if (!newName.trim() || oldName === newName.trim()) return

      // 检查新名称是否已存在
      const currentCategories = activeTab === 'abbreviations' ? abbreviationCategories : scriptScenarios
      if (currentCategories.includes(newName.trim()) && newName.trim() !== oldName) {
        setError('该分类名称已存在')
        return
      }

      if (activeTab === 'abbreviations') {
        // 更新数据库中所有对应分类的记录
        const { error: updateError } = await supabase
          .from('knowledge_abbreviations')
          .update({ category: newName.trim() })
          .eq('category', oldName)

        if (updateError) throw updateError

        // 更新本地状态
        setAbbreviations(abbreviations.map(abbr => 
          abbr.category === oldName ? { ...abbr, category: newName.trim() } : abbr
        ))
        
        // 更新分类列表
        const filteredCategories = abbreviationCategories.filter(cat => cat !== '其他' && cat !== oldName)
        const sortedCategories = [...filteredCategories, newName.trim()]
          .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
        setAbbreviationCategories([...sortedCategories, '其他'])
      } else {
        // 更新数据库中所有对应场景的记录
        const { error: updateError } = await supabase
          .from('knowledge_scripts')
          .update({ scenario: newName.trim() })
          .eq('scenario', oldName)

        if (updateError) throw updateError

        // 更新本地状态
        setScripts(scripts.map(script => 
          script.scenario === oldName ? { ...script, scenario: newName.trim() } : script
        ))
        
        // 更新场景列表
        const filteredScenarios = scriptScenarios.filter(sc => sc !== '其他' && sc !== oldName)
        const sortedScenarios = [...filteredScenarios, newName.trim()]
          .sort((a, b) => a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' }))
        setScriptScenarios([...sortedScenarios, '其他'])
      }

      // 如果当前选中的分类被修改了，更新选中状态
      if (selectedCategory === oldName) {
        setSelectedCategory(newName.trim())
      }

      setShowEditCategoryModal(false)
      setEditCategoryForm({ oldName: '', newName: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '编辑分类失败')
    }
  }

  // 打开编辑分类模态框
  const openEditCategoryModal = (categoryName: string) => {
    setEditCategoryForm({ oldName: categoryName, newName: categoryName })
    setShowEditCategoryModal(true)
  }

  if (loading) return <div className="p-6"><LoadingSpinner size="large" text="加载知识库..." /></div>
  if (error) return <div className="p-6 text-red-500">错误: {error}</div>

  const currentData = activeTab === 'abbreviations' ? filteredAbbreviations : filteredScripts
  const categoryOptions = getCategoryOptions()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="知识库"
      />

      {/* 标签页切换 */}
      <div className="bg-white dark:bg-[var(--component-background)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--border-color)] mb-6 neumorphic-subtle">
        <div className="flex">
          <button
            onClick={() => {
              setActiveTab('abbreviations')
              setSelectedCategory('all')
            }}
            className={`flex items-center space-x-3 px-8 py-6 font-medium transition-all duration-200 rounded-l-2xl flex-1 ${
              activeTab === 'abbreviations'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r border-blue-200 dark:border-blue-800'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)]'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">缩写库</div>
              <div className="text-xs opacity-75">越南语缩写词汇</div>
            </div>
            <div className="ml-auto bg-white dark:bg-[var(--component-background)] px-2.5 py-1 rounded-full text-xs font-medium">
              {abbreviations.length}
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('scripts')
              setSelectedCategory('all')
            }}
            className={`flex items-center space-x-3 px-8 py-6 font-medium transition-all duration-200 rounded-r-2xl flex-1 ${
              activeTab === 'scripts'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l border-blue-200 dark:border-blue-800'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)]'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold">话术库</div>
              <div className="text-xs opacity-75">对话场景和话术</div>
            </div>
            <div className="ml-auto bg-white dark:bg-[var(--component-background)] px-2.5 py-1 rounded-full text-xs font-medium">
              {scripts.length}
            </div>
          </button>
        </div>
      </div>

      {/* 创建按钮区域 */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="secondary" 
          onClick={() => setShowTestPanel(!showTestPanel)}
        >
          {showTestPanel ? '隐藏' : '显示'}向量检索测试
        </Button>
        <Button onClick={openCreateModal} neumorphic className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>创建{activeTab === 'abbreviations' ? '缩写' : '话术'}</span>
        </Button>
      </div>

      {/* 向量测试面板 */}
      {showTestPanel && (
        <div className="mb-6">
          <VectorTestComponent activeTab={activeTab} />
        </div>
      )}

      {/* 筛选和操作区域 */}
      <div className="bg-white dark:bg-[var(--component-background)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--border-color)] p-6 mb-6 neumorphic-subtle">
        {/* 分类筛选 */}
        <div className="mb-4">
          <div className="flex items-start space-x-3 mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">筛选：</span>
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                全部 ({activeTab === 'abbreviations' ? abbreviations.length : scripts.length})
              </button>
              {categoryOptions.map((option) => (
                <div key={option.value} className="group relative">
                  <button
                    onClick={() => setSelectedCategory(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                      selectedCategory === option.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                  {option.value !== '其他' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditCategoryModal(option.value)
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                      title="编辑分类"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 搜索和统计 */}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <SearchBox
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`搜索${activeTab === 'abbreviations' ? '缩写' : '话术'}...`}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              共 {currentData.length} 项
            </span>
          </div>
        </div>
      </div>

      {/* 内容展示 */}
      {currentData.length > 0 ? (
        <div className="space-y-3">
          {activeTab === 'abbreviations' ? (
            filteredAbbreviations.map((abbr) => (
              <div 
                key={abbr.id} 
                className="group bg-white dark:bg-[var(--component-background)] rounded-xl border border-gray-100 dark:border-[var(--border-color)] hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md neumorphic-subtle"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                        {abbr.category}
                      </span>
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="font-bold text-lg text-gray-900 dark:text-gray-100 flex-shrink-0">
                          {abbr.abbreviation}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">→</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                          {abbr.full_form}
                        </span>
                        {abbr.description && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">|</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {abbr.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-4 transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(abbr)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteId(abbr.id)
                          setShowDeleteModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredScripts.map((script) => (
              <div 
                key={script.id} 
                className="group bg-white dark:bg-[var(--component-background)] rounded-xl border border-gray-100 dark:border-[var(--border-color)] hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md neumorphic-subtle"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                          {script.scenario}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2 flex-shrink-0 mt-1">
                            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Q</span>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase">用户</span>
                          </div>
                          <p className="text-gray-900 dark:text-gray-100 leading-relaxed font-medium flex-1 min-w-0">
                            {script.text}
                          </p>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2 flex-shrink-0 mt-1">
                            <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">A</span>
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">回答</span>
                          </div>
                          <p className="text-gray-900 dark:text-gray-100 leading-relaxed font-semibold flex-1 min-w-0">
                            {script.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-4 transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(script)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteId(script.id)
                          setShowDeleteModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {activeTab === 'abbreviations' ? (
              <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            ) : (
              <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            暂无{activeTab === 'abbreviations' ? '缩写' : '话术'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'all' 
              ? '当前筛选条件下没有找到匹配的内容，试试调整搜索条件' 
              : `还没有创建任何${activeTab === 'abbreviations' ? '缩写' : '话术'}，点击上方按钮开始创建第一个内容`}
          </p>
          {(!searchTerm && selectedCategory === 'all') && (
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              创建{activeTab === 'abbreviations' ? '缩写' : '话术'}
            </Button>
          )}
        </div>
      )}

      {/* 编辑分类模态框 */}
      <Modal
        isOpen={showEditCategoryModal}
        onClose={() => {
          setShowEditCategoryModal(false)
          setEditCategoryForm({ oldName: '', newName: '' })
        }}
        title={`编辑${activeTab === 'abbreviations' ? '分类' : '场景'}`}
      >
        <Form onSubmit={handleEditCategory}>
          <Input
            label={`${activeTab === 'abbreviations' ? '分类' : '场景'}名称`}
            value={editCategoryForm.newName}
            onChange={(e) => setEditCategoryForm({...editCategoryForm, newName: e.target.value})}
            required
            placeholder={`输入新的${activeTab === 'abbreviations' ? '分类' : '场景'}名称`}
          />
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-full flex-shrink-0 mt-0.5"></div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">注意</p>
                <p>修改分类名称将会更新所有使用该分类的{activeTab === 'abbreviations' ? '缩写' : '话术'}记录。</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-[var(--border-color)]">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => setShowEditCategoryModal(false)}
            >
              取消
            </Button>
            <Button type="submit" neumorphic>
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 创建/编辑模态框 */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setAbbreviationForm(DEFAULT_ABBREVIATION_FORM)
          setScriptForm(DEFAULT_SCRIPT_FORM)
        }}
        title={`${showCreateModal ? '创建' : '编辑'}${activeTab === 'abbreviations' ? '缩写' : '话术'}`}
        maxWidth="2xl"
      >
        <Form onSubmit={activeTab === 'abbreviations' ? (showCreateModal ? handleCreateAbbreviation : handleEditAbbreviation) : (showCreateModal ? handleCreateScript : handleEditScript)}>
          {activeTab === 'abbreviations' ? (
            <>
              <CustomSelect
                label="分类"
                value={abbreviationForm.category}
                onChange={(value) => setAbbreviationForm({...abbreviationForm, category: value})}
                options={getFormOptions()}
                required
                allowAdd
                addLabel="添加新分类"
                onAddNew={addNewCategory}
              />

              <Input
                label="缩写"
                value={abbreviationForm.abbreviation}
                onChange={(e) => setAbbreviationForm({...abbreviationForm, abbreviation: e.target.value})}
                required
                placeholder="例如: Q.1"
              />

              <Input
                label="完整形式"
                value={abbreviationForm.full_form}
                onChange={(e) => setAbbreviationForm({...abbreviationForm, full_form: e.target.value})}
                required
                placeholder="例如: Quận 1"
              />

              <Textarea
                label="描述"
                value={abbreviationForm.description}
                onChange={(e) => setAbbreviationForm({...abbreviationForm, description: e.target.value})}
                rows={3}
                placeholder="例如: District 1 in Ho Chi Minh City"
              />
            </>
          ) : (
            <>
              <CustomSelect
                label="场景"
                value={scriptForm.scenario}
                onChange={(value) => setScriptForm({...scriptForm, scenario: value})}
                options={getFormOptions()}
                required
                allowAdd
                addLabel="添加新场景"
                onAddNew={addNewCategory}
              />

              <Textarea
                label="用户对话"
                value={scriptForm.text}
                onChange={(e) => setScriptForm({...scriptForm, text: e.target.value})}
                rows={4}
                required
                placeholder="输入用户可能的对话内容..."
              />

              <Textarea
                label="回答话术"
                value={scriptForm.answer}
                onChange={(e) => setScriptForm({...scriptForm, answer: e.target.value})}
                rows={4}
                required
                placeholder="输入对应的回答话术..."
              />
            </>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-[var(--border-color)]">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(false)
              }}
            >
              取消
            </Button>
            <Button type="submit" neumorphic>
              {showCreateModal ? '创建' : '保存'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteId('')
        }}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除这个${activeTab === 'abbreviations' ? '缩写' : '话术'}吗？此操作无法撤销。`}
        confirmText={deleting ? '删除中...' : '删除'}
        cancelText="取消"
        type="danger"
      />
    </div>
  )
} 