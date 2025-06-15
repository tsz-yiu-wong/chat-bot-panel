'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, MessageSquare, Hash, Folder } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Form, Input, Textarea } from '@/components/ui/form'
import { SearchBox } from '@/components/ui/search-box'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingSpinner } from '@/components/ui/loading'

// 类型定义
interface TopicCategory {
  id: string
  name_cn: string
  name_vn: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface TopicSubcategory {
  id: string
  category_id: string
  name_cn: string
  name_vn: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface Topic {
  id: string
  category_id: string
  subcategory_id: string
  content: string
  usage_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

// 扩展类型，包含关联数据
interface CategoryWithData extends TopicCategory {
  subcategories: SubcategoryWithTopics[]
}

interface SubcategoryWithTopics extends TopicSubcategory {
  topics: Topic[]
}

// 编辑项目的类型
interface EditableItem {
  id: string
  name_cn?: string
  name_vn?: string
  content?: string
  sort_order: number
  category_id?: string
  subcategory_id?: string
}

export default function TopicsPage() {
  const [categories, setCategories] = useState<CategoryWithData[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  const [selectedLevel, setSelectedLevel] = useState<'category' | 'subcategory' | 'topic'>('category')
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Topic[]>([])
  const [highlightedTopicId, setHighlightedTopicId] = useState<string>('')
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string>('')
  const [deleteType, setDeleteType] = useState<'category' | 'subcategory' | 'topic'>('category')
  const [deleting, setDeleting] = useState(false)

  // 拖拽检测相关状态
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    id: '',
    name_cn: '',
    name_vn: '',
    content: '',
    sort_order: 0,
    category_id: '',
    subcategory_id: ''
  })

  // 优化搜索：添加防抖功能
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms 防抖

    return () => clearTimeout(timer)
  }, [searchTerm])

  // 搜索处理 - 使用防抖后的搜索词
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      const results = categories.flatMap(category => 
        category.subcategories.flatMap(subcategory => 
          subcategory.topics.filter(topic => 
            topic.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          )
        )
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
      setHighlightedTopicId('')
    }
  }, [debouncedSearchTerm, categories])

  // 加载所有数据
  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      setLoading(true)
      
      // 使用单次 JOIN 查询获取所有数据，提高性能，过滤软删除记录
      const { data: allData, error } = await supabase
        .from('topic_categories')
        .select(`
          *,
          subcategories:topic_subcategories!inner(
            *,
            topics:topics!inner(*)
          )
        `)
        .eq('is_deleted', false)
        .eq('subcategories.is_deleted', false)
        .eq('subcategories.topics.is_deleted', false)
        .order('sort_order', { ascending: true })

      if (error) throw error

      // 处理数据结构，确保排序正确
      const processedCategories = allData?.map(category => ({
        ...category,
        subcategories: (category.subcategories || [])
          .map((sub: TopicSubcategory & { topics: Topic[] }) => ({
            ...sub,
            topics: (sub.topics || []).sort((a: Topic, b: Topic) => a.sort_order - b.sort_order)
          }))
          .sort((a: TopicSubcategory, b: TopicSubcategory) => a.sort_order - b.sort_order)
      })) || []

      setCategories(processedCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 切换分类展开状态
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId)
      } else {
        newExpanded.add(categoryId)
      }
      return newExpanded
    })
  }, [])

  // 切换子分类展开状态
  const toggleSubcategory = useCallback((subcategoryId: string) => {
    setExpandedSubcategories(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(subcategoryId)) {
        newExpanded.delete(subcategoryId)
      } else {
        newExpanded.add(subcategoryId)
      }
      return newExpanded
    })
  }, [])

  // 搜索结果点击处理
  const handleSearchResultClick = useCallback((topic: Topic) => {
    // 展开相关的分类和子分类
    setExpandedCategories(prev => new Set([...prev, topic.category_id]))
    setExpandedSubcategories(prev => new Set([...prev, topic.subcategory_id]))
    
    // 高亮话题
    setHighlightedTopicId(topic.id)
    
    // 清空搜索
    setSearchTerm('')
    
    // 滚动到目标元素
    setTimeout(() => {
      const element = document.getElementById(`topic-${topic.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [])

  // 使用useMemo优化分类数据的计算
  const categoryStats = useMemo(() => {
    return categories.map(category => ({
      id: category.id,
      subcategoryCount: category.subcategories.length,
      topicCount: category.subcategories.reduce((sum, sub) => sum + sub.topics.length, 0)
    }))
  }, [categories])

  // 创建处理函数
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (selectedLevel === 'category') {
        // 获取当前最大排序值，如果没有数据则从1000开始
        const maxSortOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.sort_order)) 
          : 999
        const nextSortOrder = maxSortOrder + 1

        const { data, error } = await supabase
          .from('topic_categories')
          .insert([{
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: nextSortOrder
          }])
          .select()
          
        if (error) throw error
        
        // 局部更新状态，避免重新获取所有数据
        if (data?.[0]) {
          setCategories(prev => [...prev, { ...data[0], subcategories: [] }])
        }
      } else if (selectedLevel === 'subcategory') {
        const category = categories.find(c => c.id === formData.category_id)
        const maxSortOrder = category?.subcategories && category.subcategories.length > 0
          ? Math.max(...category.subcategories.map(s => s.sort_order))
          : 999
        const nextSortOrder = maxSortOrder + 1

        const { data, error } = await supabase
          .from('topic_subcategories')
          .insert([{
            category_id: formData.category_id,
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: nextSortOrder
          }])
          .select()
          
        if (error) throw error
        
        // 局部更新状态
        if (data?.[0] && category) {
          setCategories(prev => prev.map(cat => 
            cat.id === formData.category_id 
              ? { 
                  ...cat, 
                  subcategories: [...cat.subcategories, { ...data[0], topics: [] }]
                }
              : cat
          ))
        }
      } else if (selectedLevel === 'topic') {
        const category = categories.find(c => c.id === formData.category_id)
        const subcategory = category?.subcategories.find(s => s.id === formData.subcategory_id)
        const maxSortOrder = subcategory?.topics && subcategory.topics.length > 0
          ? Math.max(...subcategory.topics.map(t => t.sort_order))
          : 999
        const nextSortOrder = maxSortOrder + 1

        const { data, error } = await supabase
          .from('topics')
          .insert([{
            category_id: formData.category_id,
            subcategory_id: formData.subcategory_id,
            content: formData.content,
            usage_count: 0,
            sort_order: nextSortOrder
          }])
          .select()
          
        if (error) throw error
        
        // 局部更新状态
        if (data?.[0] && category && subcategory) {
          setCategories(prev => prev.map(cat => 
            cat.id === formData.category_id
              ? {
                  ...cat,
                  subcategories: cat.subcategories.map(sub =>
                    sub.id === formData.subcategory_id
                      ? { ...sub, topics: [...sub.topics, data[0]] }
                      : sub
                  )
                }
              : cat
          ))
        }
      }

      setShowCreateModal(false)
      resetFormData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
  }

  // 编辑处理函数
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    
    // 保存原始状态用于错误回滚
    const originalCategories = [...categories]
    
    // 乐观更新：立即更新本地状态
    if (selectedLevel === 'category') {
      const optimisticCategory = {
        ...categories.find(c => c.id === formData.id)!,
        name_cn: formData.name_cn,
        name_vn: formData.name_vn,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString()
      }
      
      // 立即更新UI
      setCategories(prev => prev.map(category => 
        category.id === formData.id 
          ? { ...category, ...optimisticCategory }
          : category
      ))
    } else if (selectedLevel === 'subcategory') {
      const optimisticSubcategory = {
        ...categories.flatMap(c => c.subcategories).find(s => s.id === formData.id)!,
        name_cn: formData.name_cn,
        name_vn: formData.name_vn,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString()
      }
      
      // 立即更新UI
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.map(sub =>
          sub.id === formData.id ? { ...sub, ...optimisticSubcategory } : sub
        )
      })))
    } else if (selectedLevel === 'topic') {
      const optimisticTopic = {
        ...categories.flatMap(c => c.subcategories).flatMap(s => s.topics).find(t => t.id === formData.id)!,
        content: formData.content,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString()
      }
      
      // 立即更新UI
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.map(sub => ({
          ...sub,
          topics: sub.topics.map(topic =>
            topic.id === formData.id ? { ...topic, ...optimisticTopic } : topic
          )
        }))
      })))
    }
    
    // 关闭模态框
    setShowEditModal(false)
    resetFormData()

    try {
      if (selectedLevel === 'category') {
        const { data, error } = await supabase
          .from('topic_categories')
          .update({
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
          .select()
          
        if (error) throw error
        
        // 成功后更新为真实数据
        if (data?.[0]) {
          setCategories(prev => prev.map(category => 
            category.id === formData.id 
              ? { ...category, ...data[0] }
              : category
          ))
        }
      } else if (selectedLevel === 'subcategory') {
        const { data, error } = await supabase
          .from('topic_subcategories')
          .update({
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
          .select()
          
        if (error) throw error
        
        // 成功后更新为真实数据
        if (data?.[0]) {
          setCategories(prev => prev.map(category => ({
            ...category,
            subcategories: category.subcategories.map(sub =>
              sub.id === formData.id ? { ...sub, ...data[0] } : sub
            )
          })))
        }
      } else if (selectedLevel === 'topic') {
        const { data, error } = await supabase
          .from('topics')
          .update({
            content: formData.content,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
          .select()
          
        if (error) throw error
        
        // 成功后更新为真实数据
        if (data?.[0]) {
          setCategories(prev => prev.map(category => ({
            ...category,
            subcategories: category.subcategories.map(sub => ({
              ...sub,
              topics: sub.topics.map(topic =>
                topic.id === formData.id ? { ...topic, ...data[0] } : topic
              )
            }))
          })))
        }
      }
    } catch (err) {
      // 失败时回滚状态
      setCategories(originalCategories)
      setError(err instanceof Error ? err.message : '编辑失败')
      
      // 重新打开模态框
      setShowEditModal(true)
    }
  }

  // 删除处理函数 - 改为软删除，支持级联
  async function handleDelete() {
    setDeleting(true)
    
    // 保存原始状态用于错误回滚
    const originalCategories = [...categories]
    
    // 乐观更新：立即从UI中移除
    if (deleteType === 'category') {
      setCategories(prev => prev.filter(category => category.id !== deleteId))
    } else if (deleteType === 'subcategory') {
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.filter(sub => sub.id !== deleteId)
      })))
    } else if (deleteType === 'topic') {
      setCategories(prev => prev.map(category => ({
        ...category,
        subcategories: category.subcategories.map(sub => ({
          ...sub,
          topics: sub.topics.filter(topic => topic.id !== deleteId)
        }))
      })))
    }
    
    // 关闭模态框
    setShowDeleteModal(false)
    const currentDeleteId = deleteId
    const currentDeleteType = deleteType
    setDeleteId('')

    try {
      if (currentDeleteType === 'category') {
        // 级联软删除：先删除所有相关的话题，再删除小类，最后删除大类
        const category = originalCategories.find(c => c.id === currentDeleteId)
        if (category) {
          // 软删除所有相关话题
          for (const subcategory of category.subcategories) {
            if (subcategory.topics.length > 0) {
              const { error: topicError } = await supabase
                .from('topics')
                .update({ is_deleted: true })
                .eq('subcategory_id', subcategory.id)
                .eq('is_deleted', false)
              
              if (topicError) throw topicError
            }
          }
          
          // 软删除所有相关小类
          if (category.subcategories.length > 0) {
            const { error: subcategoryError } = await supabase
              .from('topic_subcategories')
              .update({ is_deleted: true })
              .eq('category_id', currentDeleteId)
              .eq('is_deleted', false)
            
            if (subcategoryError) throw subcategoryError
          }
        }
        
        // 软删除大类
        const { error } = await supabase
          .from('topic_categories')
          .update({ is_deleted: true })
          .eq('id', currentDeleteId)
          
        if (error) throw error
      } else if (currentDeleteType === 'subcategory') {
        // 级联软删除：先删除所有相关话题，再删除小类
        const subcategory = originalCategories
          .flatMap(c => c.subcategories)
          .find(s => s.id === currentDeleteId)
        
        if (subcategory && subcategory.topics.length > 0) {
          // 软删除所有相关话题
          const { error: topicError } = await supabase
            .from('topics')
            .update({ is_deleted: true })
            .eq('subcategory_id', currentDeleteId)
            .eq('is_deleted', false)
          
          if (topicError) throw topicError
        }
        
        // 软删除小类
        const { error } = await supabase
          .from('topic_subcategories')
          .update({ is_deleted: true })
          .eq('id', currentDeleteId)
          
        if (error) throw error
      } else if (currentDeleteType === 'topic') {
        // 软删除话题
        const { error } = await supabase
          .from('topics')
          .update({ is_deleted: true })
          .eq('id', currentDeleteId)
          
        if (error) throw error
      }
    } catch (err) {
      // 失败时回滚状态
      setCategories(originalCategories)
      setError(err instanceof Error ? err.message : '删除失败')
      
      // 重新打开删除模态框
      setDeleteId(currentDeleteId)
      setDeleteType(currentDeleteType)  
      setShowDeleteModal(true)
    } finally {
      setDeleting(false)
    }
  }

  function resetFormData() {
    setFormData({
      id: '',
      name_cn: '',
      name_vn: '',
      content: '',
      sort_order: 0,
      category_id: '',
      subcategory_id: ''
    })
  }

  function openCreateModal(level: 'category' | 'subcategory' | 'topic', categoryId = '', subcategoryId = '') {
    setSelectedLevel(level)
    setFormData({
      ...formData,
      category_id: categoryId,
      subcategory_id: subcategoryId
    })
    setShowCreateModal(true)
  }

  function openEditModal(level: 'category' | 'subcategory' | 'topic', item: EditableItem) {
    setSelectedLevel(level)
    setFormData({
      id: item.id,
      name_cn: item.name_cn || '',
      name_vn: item.name_vn || '',
      content: item.content || '',
      sort_order: item.sort_order || 0,
      category_id: item.category_id || '',
      subcategory_id: item.subcategory_id || ''
    })
    setShowEditModal(true)
  }

  function openDeleteModal(id: string, type: 'category' | 'subcategory' | 'topic') {
    setDeleteId(id)
    setDeleteType(type)
    setShowDeleteModal(true)
  }

  // 处理鼠标按下事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  // 处理点击事件，只有在非拖拽情况下才触发
  const handleToggleClick = useCallback((toggleFunction: () => void, e: React.MouseEvent) => {
    if (!dragStart) return
    
    const deltaX = Math.abs(e.clientX - dragStart.x)
    const deltaY = Math.abs(e.clientY - dragStart.y)
    const threshold = 5 // 5像素的容差
    
    // 只有在移动距离很小时才认为是点击操作
    if (deltaX <= threshold && deltaY <= threshold) {
      // 检查是否有文字被选中
      const selection = window.getSelection()
      if (!selection || selection.toString().length === 0) {
        toggleFunction()
      }
    }
    
    setDragStart(null)
  }, [dragStart])

  if (loading) {
    return <div className="p-6"><LoadingSpinner size="large" text="加载话题库..." /></div>
  }

  if (error) {
    return <div className="p-6 text-red-500">错误: {error}</div>
  }

  return (
    <div className="p-6">
      <PageHeader title="话题库" />

      {/* 搜索框 */}
      <div className="mb-6">
        <SearchBox
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索话题内容..."
        />
        
        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-[var(--component-background)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((topic) => {
              const category = categories.find(c => c.id === topic.category_id)
              const subcategory = category?.subcategories.find(s => s.id === topic.subcategory_id)
              return (
                <button
                  key={topic.id}
                  onClick={() => handleSearchResultClick(topic)}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)] border-b border-gray-100 dark:border-[var(--border-color)] last:border-b-0"
                >
                  <div className="text-sm text-gray-900 dark:text-gray-100">{topic.content}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {category?.name_vn} ({category?.name_cn}) → {subcategory?.name_vn} ({subcategory?.name_cn})
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 分类树 */}
      <div className="bg-white dark:bg-[var(--component-background)] rounded-lg border border-gray-200 dark:border-[var(--border-color)] neumorphic-subtle">
        <div className="divide-y divide-gray-200 dark:divide-[var(--border-color)]">
          {categories.map((category) => (
            <div key={category.id}>
              {/* 大类 */}
              <div 
                className="group p-4 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)] transition-colors duration-150 hover:shadow-sm"
                onMouseDown={handleMouseDown}
                onClick={(e) => handleToggleClick(() => toggleCategory(category.id), e)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0 mr-4">
                    <div className="p-1 hover:bg-gray-100 dark:hover:bg-[var(--accent-background)] rounded">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <Hash className="h-5 w-5 text-blue-500 ml-2 flex-shrink-0" />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100 cursor-text select-text break-words">
                          {category.name_vn} ({category.name_cn})
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 cursor-text select-text whitespace-nowrap">
                          {categoryStats.find(stat => stat.id === category.id)?.subcategoryCount || 0} 个小类，
                          {categoryStats.find(stat => stat.id === category.id)?.topicCount || 0} 个话题
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="action-buttons action-buttons-hover flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal('category', { id: category.id, name_cn: category.name_cn, name_vn: category.name_vn, sort_order: category.sort_order })}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="编辑大类"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(category.id, 'category')}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="删除大类"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 小类 */}
              {expandedCategories.has(category.id) && (
                <>
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="ml-6 border-l border-gray-200 dark:border-[var(--border-color)]">
                      <div 
                        className="group p-4 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)] transition-colors duration-150 hover:shadow-sm"
                        onMouseDown={handleMouseDown}
                        onClick={(e) => handleToggleClick(() => toggleSubcategory(subcategory.id), e)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0 mr-4">
                            <div className="p-1 hover:bg-gray-100 dark:hover:bg-[var(--accent-background)] rounded">
                              {expandedSubcategories.has(subcategory.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <Folder className="h-4 w-4 text-green-500 ml-2 flex-shrink-0" />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100 cursor-text select-text break-words">
                                  {subcategory.name_vn} ({subcategory.name_cn})
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 cursor-text select-text whitespace-nowrap">
                                  {subcategory.topics.length} 个话题
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="action-buttons action-buttons-hover flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal('subcategory', { id: subcategory.id, name_cn: subcategory.name_cn, name_vn: subcategory.name_vn, sort_order: subcategory.sort_order, category_id: subcategory.category_id })}
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="编辑小类"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(subcategory.id, 'subcategory')}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="删除小类"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 话题 */}
                      {expandedSubcategories.has(subcategory.id) && (
                        <>
                          {subcategory.topics.map((topic) => (
                            <div 
                              key={topic.id} 
                              id={`topic-${topic.id}`}
                              className={`group ml-6 border-l border-gray-200 dark:border-[var(--border-color)] ${
                                highlightedTopicId === topic.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                              }`}
                            >
                              <div className="p-4 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)] transition-colors duration-150 hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-1 min-w-0 mr-4">
                                    <MessageSquare className="h-4 w-4 text-purple-500 ml-4 flex-shrink-0" />
                                    <div className="ml-3 flex-1 min-w-0">
                                      <div className="flex flex-col">
                                        <span className="text-sm text-gray-900 dark:text-gray-100 cursor-text select-text break-words">{topic.content}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 cursor-text select-text whitespace-nowrap">
                                          使用次数: {topic.usage_count}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="action-buttons action-buttons-hover flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal('topic', { id: topic.id, content: topic.content, sort_order: topic.sort_order, category_id: topic.category_id, subcategory_id: topic.subcategory_id })}
                                      className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                      title="编辑话题"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteModal(topic.id, 'topic')}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      title="删除话题"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* 添加话题按钮 */}
                          <div className="ml-6 border-l border-gray-200 dark:border-[var(--border-color)] pb-6">
                            <div className="pl-4 pt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateModal('topic', category.id, subcategory.id)}
                                className="px-3 py-2 border border-dashed border-gray-300 dark:border-[var(--border-color)] hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              >
                                <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
                                  <Plus className="h-3 w-3 mr-1" />
                                  <span className="text-xs">添加话题</span>
                                </div>
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {/* 添加小类按钮 */}
                  <div className="ml-6 border-l border-gray-200 dark:border-[var(--border-color)] pb-6">
                    <div className="pl-4 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateModal('subcategory', category.id)}
                        className="px-3 py-2 border border-dashed border-gray-300 dark:border-[var(--border-color)] hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400">
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="text-xs">添加小类</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* 添加大类按钮 */}
          <div className="m-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateModal('category')}
              className="px-3 py-2 border border-dashed border-gray-300 dark:border-[var(--border-color)] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Plus className="h-3 w-3 mr-1" />
                <span className="text-xs">添加大类</span>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* 创建模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
          selectedLevel === 'category' ? '新建大类' :
          selectedLevel === 'subcategory' ? '新建小类' : '新建话题'
        }
      >
        <Form onSubmit={handleCreate}>
          {(selectedLevel === 'category' || selectedLevel === 'subcategory') && (
            <>
              <Input
                label={selectedLevel === 'category' ? 'Tên danh mục lớn' : 'Tên danh mục nhỏ'}
                value={formData.name_vn}
                onChange={(e) => setFormData({ ...formData, name_vn: e.target.value })}
                required
              />
              <Input
                label={selectedLevel === 'category' ? '大类名称' : '小类名称'}
                value={formData.name_cn}
                onChange={(e) => setFormData({ ...formData, name_cn: e.target.value })}
              />
            </>
          )}
          
          {selectedLevel === 'topic' && (
            <Textarea
              label="Nội dung chủ đề chủ động"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              required
            />
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button type="submit" neumorphic>
              创建
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={
          selectedLevel === 'category' ? '编辑大类' :
          selectedLevel === 'subcategory' ? '编辑小类' : '编辑话题'
        }
      >
        <Form onSubmit={handleEdit}>
          {(selectedLevel === 'category' || selectedLevel === 'subcategory') && (
            <>
              <Input
                label={selectedLevel === 'category' ? 'Tên danh mục lớn' : 'Tên danh mục nhỏ'}
                value={formData.name_vn}
                onChange={(e) => setFormData({ ...formData, name_vn: e.target.value })}
                required
              />
              <Input
                label={selectedLevel === 'category' ? '大类名称' : '小类名称'}
                value={formData.name_cn}
                onChange={(e) => setFormData({ ...formData, name_cn: e.target.value })}
              />
            </>
          )}
          
          {selectedLevel === 'topic' && (
            <Textarea
              label="Nội dung chủ đề chủ động"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              required
            />
          )}

          <Input
            label="排序"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
              取消
            </Button>
            <Button type="submit" neumorphic>
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除这个${deleteType === 'category' ? '大类' : deleteType === 'subcategory' ? '小类' : '话题'}吗？${
          deleteType === 'category' ? '这将同时删除其下的所有小类和话题。' :
          deleteType === 'subcategory' ? '这将同时删除其下的所有话题。' : ''
        }`}
        confirmText={deleting ? '删除中...' : '删除'}
        cancelText="取消"
        type="danger"
      />
    </div>
  )
} 