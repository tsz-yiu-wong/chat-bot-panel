'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, MessageSquare, Hash, Folder, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

  // 加载所有数据
  useEffect(() => {
    fetchAllData()
  }, [])

  // 搜索处理
  useEffect(() => {
    if (searchTerm.trim()) {
      const results = categories.flatMap(category => 
        category.subcategories.flatMap(subcategory => 
          subcategory.topics.filter(topic => 
            topic.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
      setHighlightedTopicId('')
    }
  }, [searchTerm, categories])

  async function fetchAllData() {
    try {
      setLoading(true)
      
      // 获取所有分类
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('topic_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (categoriesError) throw categoriesError

      // 获取所有子分类
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('topic_subcategories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (subcategoriesError) throw subcategoriesError

      // 获取所有话题
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order', { ascending: true })

      if (topicsError) throw topicsError

      // 组织数据结构
      const categoryMap = new Map<string, CategoryWithData>()
      
      // 初始化分类
      categoriesData?.forEach(category => {
        categoryMap.set(category.id, {
          ...category,
          subcategories: []
        })
      })

      // 添加子分类
      subcategoriesData?.forEach(subcategory => {
        const category = categoryMap.get(subcategory.category_id)
        if (category) {
          category.subcategories.push({
            ...subcategory,
            topics: []
          })
        }
      })

      // 添加话题
      topicsData?.forEach(topic => {
        const category = categoryMap.get(topic.category_id)
        if (category) {
          const subcategory = category.subcategories.find(sub => sub.id === topic.subcategory_id)
          if (subcategory) {
            subcategory.topics.push(topic)
          }
        }
      })

      setCategories(Array.from(categoryMap.values()))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 切换分类展开状态
  function toggleCategory(categoryId: string) {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // 切换子分类展开状态
  function toggleSubcategory(subcategoryId: string) {
    const newExpanded = new Set(expandedSubcategories)
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId)
    } else {
      newExpanded.add(subcategoryId)
    }
    setExpandedSubcategories(newExpanded)
  }

  // 搜索结果点击处理
  function handleSearchResultClick(topic: Topic) {
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
  }

  // 创建处理函数
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (selectedLevel === 'category') {
        // 获取当前最大排序值，如果没有数据则从1000开始
        const { data: maxData } = await supabase
          .from('topic_categories')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)

        const nextSortOrder = maxData && maxData.length > 0 ? (maxData[0].sort_order + 1) : 1000

        const { error } = await supabase
          .from('topic_categories')
          .insert([{
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: nextSortOrder
          }])
        if (error) throw error
      } else if (selectedLevel === 'subcategory') {
        // 获取当前分类下最大排序值，如果没有数据则从1000开始
        const { data: maxData } = await supabase
          .from('topic_subcategories')
          .select('sort_order')
          .eq('category_id', formData.category_id)
          .order('sort_order', { ascending: false })
          .limit(1)

        const nextSortOrder = maxData && maxData.length > 0 ? (maxData[0].sort_order + 1) : 1000

        const { error } = await supabase
          .from('topic_subcategories')
          .insert([{
            category_id: formData.category_id,
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: nextSortOrder
          }])
        if (error) throw error
      } else if (selectedLevel === 'topic') {
        // 获取当前子分类下最大排序值，如果没有数据则从1000开始
        const { data: maxData } = await supabase
          .from('topics')
          .select('sort_order')
          .eq('subcategory_id', formData.subcategory_id)
          .order('sort_order', { ascending: false })
          .limit(1)

        const nextSortOrder = maxData && maxData.length > 0 ? (maxData[0].sort_order + 1) : 1000

        const { error } = await supabase
          .from('topics')
          .insert([{
            category_id: formData.category_id,
            subcategory_id: formData.subcategory_id,
            content: formData.content,
            usage_count: 0,
            sort_order: nextSortOrder
          }])
        if (error) throw error
      }

      await fetchAllData()
      setShowCreateModal(false)
      resetFormData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
  }

  // 编辑处理函数
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (selectedLevel === 'category') {
        const { error } = await supabase
          .from('topic_categories')
          .update({
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
        if (error) throw error
      } else if (selectedLevel === 'subcategory') {
        const { error } = await supabase
          .from('topic_subcategories')
          .update({
            name_cn: formData.name_cn,
            name_vn: formData.name_vn,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
        if (error) throw error
      } else if (selectedLevel === 'topic') {
        const { error } = await supabase
          .from('topics')
          .update({
            content: formData.content,
            sort_order: formData.sort_order
          })
          .eq('id', formData.id)
        if (error) throw error
      }

      await fetchAllData()
      setShowEditModal(false)
      resetFormData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '编辑失败')
    }
  }

  // 删除处理函数
  async function handleDelete() {
    try {
      if (deleteType === 'category') {
        const { error } = await supabase
          .from('topic_categories')
          .delete()
          .eq('id', deleteId)
        if (error) throw error
      } else if (deleteType === 'subcategory') {
        const { error } = await supabase
          .from('topic_subcategories')
          .delete()
          .eq('id', deleteId)
        if (error) throw error
      } else if (deleteType === 'topic') {
        const { error } = await supabase
          .from('topics')
          .delete()
          .eq('id', deleteId)
        if (error) throw error
      }

      await fetchAllData()
      setShowDeleteModal(false)
      setDeleteId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-600 dark:text-red-400">错误: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">话题库</h1>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索话题内容..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((topic) => {
              const category = categories.find(c => c.id === topic.category_id)
              const subcategory = category?.subcategories.find(s => s.id === topic.subcategory_id)
              return (
                <button
                  key={topic.id}
                  onClick={() => handleSearchResultClick(topic)}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                >
                  <div className="text-sm text-gray-900 dark:text-gray-100">{topic.content}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {category?.name_cn} ({category?.name_vn}) → {subcategory?.name_cn} ({subcategory?.name_vn})
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 分类树 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">分类结构</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {categories.map((category) => (
            <div key={category.id}>
              {/* 大类 */}
              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <Hash className="h-5 w-5 text-blue-500 ml-2" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {category.name_cn} ({category.name_vn})
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {category.subcategories.length} 个小类，
                          {category.subcategories.reduce((sum, sub) => sum + sub.topics.length, 0)} 个话题
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal('category', { id: category.id, name_cn: category.name_cn, name_vn: category.name_vn, sort_order: category.sort_order })}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="编辑大类"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(category.id, 'category')}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="删除大类"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 小类 */}
              {expandedCategories.has(category.id) && (
                <>
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="ml-6 border-l border-gray-200 dark:border-gray-700">
                      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <button
                              onClick={() => toggleSubcategory(subcategory.id)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                            >
                              {expandedSubcategories.has(subcategory.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                            <Folder className="h-4 w-4 text-green-500 ml-2" />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {subcategory.name_cn} ({subcategory.name_vn})
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  {subcategory.topics.length} 个话题
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditModal('subcategory', { id: subcategory.id, name_cn: subcategory.name_cn, name_vn: subcategory.name_vn, sort_order: subcategory.sort_order, category_id: subcategory.category_id })}
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              title="编辑小类"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(subcategory.id, 'subcategory')}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="删除小类"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
                              className={`ml-6 border-l border-gray-200 dark:border-gray-700 ${
                                highlightedTopicId === topic.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                              }`}
                            >
                              <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-1">
                                    <MessageSquare className="h-4 w-4 text-purple-500 ml-4" />
                                    <div className="ml-3 flex-1">
                                      <div className="flex items-center">
                                        <span className="text-sm text-gray-900 dark:text-gray-100">{topic.content}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          使用次数: {topic.usage_count}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => openEditModal('topic', { id: topic.id, content: topic.content, sort_order: topic.sort_order, category_id: topic.category_id, subcategory_id: topic.subcategory_id })}
                                      className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                      title="编辑话题"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(topic.id, 'topic')}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                      title="删除话题"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* 添加话题按钮 */}
                          <div className="ml-6 border-l border-gray-200 dark:border-gray-700 pb-6">
                            <div className="pl-4 pt-3">
                              <button
                                onClick={() => openCreateModal('topic', category.id, subcategory.id)}
                                className="px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-150 rounded"
                              >
                                <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400">
                                  <Plus className="h-3 w-3 mr-1" />
                                  <span className="text-xs">添加话题</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {/* 添加小类按钮 */}
                  <div className="ml-6 border-l border-gray-200 dark:border-gray-700 pb-6">
                    <div className="pl-4 pt-3">
                      <button
                        onClick={() => openCreateModal('subcategory', category.id)}
                        className="px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-150 rounded"
                      >
                        <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400">
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="text-xs">添加小类</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* 添加大类按钮 */}
          <div className="m-4">
            <button
              onClick={() => openCreateModal('category')}
              className="px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 rounded"
            >
              <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Plus className="h-3 w-3 mr-1" />
                <span className="text-xs">添加大类</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {selectedLevel === 'category' && '新建大类'}
                {selectedLevel === 'subcategory' && '新建小类'}
                {selectedLevel === 'topic' && '新建话题'}
              </h3>
              
              <form onSubmit={handleCreate} className="space-y-4">
                {(selectedLevel === 'category' || selectedLevel === 'subcategory') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        中文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_cn}
                        onChange={(e) => setFormData({ ...formData, name_cn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        越南文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_vn}
                        onChange={(e) => setFormData({ ...formData, name_vn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
                
                {selectedLevel === 'topic' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      话题内容
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {selectedLevel === 'category' && '编辑大类'}
                {selectedLevel === 'subcategory' && '编辑小类'}
                {selectedLevel === 'topic' && '编辑话题'}
              </h3>
              
              <form onSubmit={handleEdit} className="space-y-4">
                {(selectedLevel === 'category' || selectedLevel === 'subcategory') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        中文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_cn}
                        onChange={(e) => setFormData({ ...formData, name_cn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        越南文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_vn}
                        onChange={(e) => setFormData({ ...formData, name_vn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </>
                )}
                
                {selectedLevel === 'topic' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      话题内容
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    排序
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">确认删除</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                确定要删除这个{deleteType === 'category' ? '大类' : deleteType === 'subcategory' ? '小类' : '话题'}吗？
                {deleteType === 'category' && '这将同时删除其下的所有小类和话题。'}
                {deleteType === 'subcategory' && '这将同时删除其下的所有话题。'}
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 