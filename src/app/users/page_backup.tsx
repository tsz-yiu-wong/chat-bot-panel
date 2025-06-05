'use client'

import { useState } from 'react'
import { Plus, Users, Tag, Edit, Trash2, MessageSquare, Calendar, Filter, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// 模拟数据
const mockUsers = [
  {
    user_id: '1',
    external_user_id: 'user_12345',
    name: '张三',
    email: 'zhangsan@example.com',
    tags: ['vip_user', 'technical_background'],
    total_chats: 45,
    last_active: '2024-01-20T15:30:00Z',
    created_at: '2024-01-10T08:00:00Z',
    status: 'active'
  },
  {
    user_id: '2',
    external_user_id: 'user_67890',
    name: '李四',
    email: 'lisi@example.com',
    tags: ['new_user'],
    total_chats: 12,
    last_active: '2024-01-19T10:15:00Z',
    created_at: '2024-01-18T14:20:00Z',
    status: 'active'
  },
  {
    user_id: '3',
    external_user_id: 'user_11111',
    name: '王五',
    email: 'wangwu@example.com',
    tags: ['vip_user', 'frequent_user'],
    total_chats: 128,
    last_active: '2024-01-15T16:45:00Z',
    created_at: '2024-01-05T09:30:00Z',
    status: 'inactive'
  },
  {
    user_id: '4',
    external_user_id: 'user_22222',
    name: '赵六',
    email: 'zhaoliu@example.com',
    tags: ['technical_background', 'beta_user'],
    total_chats: 67,
    last_active: '2024-01-20T11:20:00Z',
    created_at: '2024-01-12T13:45:00Z',
    status: 'active'
  }
]

const mockTags = [
  { tag_id: '1', tag_name: 'vip_user', description: 'VIP用户', user_count: 2, color: 'purple' },
  { tag_id: '2', tag_name: 'new_user', description: '新用户', user_count: 1, color: 'green' },
  { tag_id: '3', tag_name: 'technical_background', description: '技术背景', user_count: 2, color: 'blue' },
  { tag_id: '4', tag_name: 'frequent_user', description: '频繁用户', user_count: 1, color: 'orange' },
  { tag_id: '5', tag_name: 'beta_user', description: '测试用户', user_count: 1, color: 'gray' }
]

export default function UsersPage() {
  const users = mockUsers
  const tags = mockTags
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showCreateTagModal, setShowCreateTagModal] = useState(false)
  const [selectedTag, setSelectedTag] = useState('all')
  const [activeTab, setActiveTab] = useState('users')

  const filteredUsers = users.filter(user => {
    const tagMatch = selectedTag === 'all' || user.tags.includes(selectedTag)
    const searchMatch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.external_user_id.toLowerCase().includes(searchTerm.toLowerCase())
    return tagMatch && searchMatch
  })

  const getTagColor = (tagName: string) => {
    const tag = tags.find(t => t.tag_name === tagName)
    return tag?.color || 'gray'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">用户管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">管理用户信息和标签系统</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateTagModal(true)}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>创建标签</span>
          </button>
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加用户</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总用户</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃用户</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {users.filter(user => user.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总对话</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {users.reduce((sum, user) => sum + user.total_chats, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">用户标签</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{tags.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              用户列表
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'tags'
                  ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              标签管理
            </button>
          </nav>
        </div>

        {activeTab === 'users' && (
          <div>
            {/* 搜索和筛选 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">所有标签</option>
                    {tags.map(tag => (
                      <option key={tag.tag_id} value={tag.tag_name}>{tag.description}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 用户列表 */}
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      标签
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      活动
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">ID: {user.external_user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {user.tags.map((tagName) => (
                            <span
                              key={tagName}
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                getTagColor(tagName) === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                                getTagColor(tagName) === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                getTagColor(tagName) === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                getTagColor(tagName) === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              }`}
                            >
                              {tags.find(t => t.tag_name === tagName)?.description || tagName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            <span>{user.total_chats} 对话</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>最后活动: {formatDate(user.last_active)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {user.status === 'active' ? '活跃' : '暂停'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div key={tag.tag_id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tag.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        tag.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        tag.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        tag.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                        'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <Tag className={`w-4 h-4 ${
                          tag.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          tag.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          tag.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          tag.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{tag.description}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tag.tag_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">用户数量</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{tag.user_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 创建用户模态框 */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">添加新用户</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入邮箱地址"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  外部用户ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入外部系统用户ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户标签
                </label>
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <label key={tag.tag_id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{tag.description}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 创建标签模态框 */}
      {showCreateTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">创建新标签</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签名称 (系统内部使用)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="例如: vip_user"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  显示名称
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="例如: VIP用户"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签颜色
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="blue">蓝色</option>
                  <option value="green">绿色</option>
                  <option value="purple">紫色</option>
                  <option value="orange">橙色</option>
                  <option value="gray">灰色</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTagModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 dark:bg-green-600 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 