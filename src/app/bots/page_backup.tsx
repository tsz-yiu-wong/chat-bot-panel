'use client'

import { useState } from 'react'
import { Plus, Bot, Edit, Trash2, MessageSquare, Users, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// 定义Bot类型
interface BotType {
  bot_id: string
  name: string
  persona_description: string
  system_prompt_template: string
  created_at: string
  updated_at: string
  status: 'active' | 'inactive'
  totalChats: number
  activeUsers: number
}

// 模拟数据
const mockBots: BotType[] = [
  {
    bot_id: '1',
    name: '客服机器人',
    persona_description: '专业的客户服务助手，能够解答常见问题并引导用户',
    system_prompt_template: '你是一个专业的客服代表...',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    status: 'active',
    totalChats: 1234,
    activeUsers: 89
  },
  {
    bot_id: '2',
    name: '技术支持机器人',
    persona_description: '技术专家，帮助用户解决技术问题和故障排除',
    system_prompt_template: '你是一个技术支持专家...',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-18T12:00:00Z',
    status: 'active',
    totalChats: 567,
    activeUsers: 23
  },
  {
    bot_id: '3',
    name: '销售助手',
    persona_description: '友好的销售顾问，协助客户了解产品和服务',
    system_prompt_template: '你是一个专业的销售顾问...',
    created_at: '2024-01-08T14:00:00Z',
    updated_at: '2024-01-19T09:15:00Z',
    status: 'inactive',
    totalChats: 890,
    activeUsers: 45
  }
]

export default function BotsPage() {
  const bots = mockBots
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">机器人管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">管理您的聊天机器人和它们的配置</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>创建机器人</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总机器人</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{bots.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃机器人</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {bots.filter(bot => bot.status === 'active').length}
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总对话数</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {bots.reduce((sum, bot) => sum + bot.totalChats, 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 机器人列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">机器人列表</h2>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  机器人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {bots.map((bot) => (
                <tr key={bot.bot_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{bot.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {bot.persona_description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      bot.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {bot.status === 'active' ? '活跃' : '暂停'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span>{bot.totalChats} 对话</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span>{bot.activeUsers} 用户</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(bot.created_at)}</span>
                    </div>
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

      {/* 创建机器人模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">创建新机器人</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  机器人名称
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入机器人名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  人设描述
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="描述这个机器人的性格和特点"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  系统提示词
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入系统提示词模板"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700"
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