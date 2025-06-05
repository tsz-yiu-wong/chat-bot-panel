'use client'

import { Hash, Search, Plus, Edit, Trash2, Eye, TrendingUp, MessageCircle, Users, Clock } from 'lucide-react'

const topicsData = [
  {
    id: 1,
    title: "产品使用问题",
    description: "用户在使用产品过程中遇到的各种问题和解决方案",
    category: "产品支持",
    keywords: ["使用", "教程", "功能", "操作"],
    responseCount: 156,
    popularity: 8.5,
    lastUsed: "2024-01-15",
    status: "活跃",
    creator: "张三",
  },
  {
    id: 2,
    title: "账户和计费",
    description: "关于用户账户管理、订阅计划和计费相关的话题",
    category: "财务服务",
    keywords: ["账户", "计费", "订阅", "付费"],
    responseCount: 89,
    popularity: 7.2,
    lastUsed: "2024-01-14",
    status: "活跃",
    creator: "李四",
  },
  {
    id: 3,
    title: "技术故障报告",
    description: "用户报告的技术问题和系统故障处理",
    category: "技术支持",
    keywords: ["故障", "bug", "错误", "修复"],
    responseCount: 234,
    popularity: 9.1,
    lastUsed: "2024-01-13",
    status: "活跃",
    creator: "王五",
  },
  {
    id: 4,
    title: "新功能建议",
    description: "用户提出的产品改进建议和新功能需求",
    category: "产品反馈",
    keywords: ["建议", "改进", "新功能", "需求"],
    responseCount: 67,
    popularity: 6.8,
    lastUsed: "2024-01-10",
    status: "普通",
    creator: "赵六",
  },
  {
    id: 5,
    title: "合作伙伴咨询",
    description: "潜在合作伙伴和企业客户的咨询话题",
    category: "商务合作",
    keywords: ["合作", "企业", "伙伴", "咨询"],
    responseCount: 43,
    popularity: 5.5,
    lastUsed: "2024-01-05",
    status: "冷淡",
    creator: "孙七",
  },
]

export default function TopicsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">话题库管理</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">管理对话话题分类和关键词匹配</p>
      </div>

      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <input
            type="text"
            placeholder="搜索话题或关键词..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option>全部分类</option>
            <option>产品支持</option>
            <option>财务服务</option>
            <option>技术支持</option>
            <option>产品反馈</option>
            <option>商务合作</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option>全部状态</option>
            <option>活跃</option>
            <option>普通</option>
            <option>冷淡</option>
          </select>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-150">
            <Plus className="h-4 w-4" />
            添加话题
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总话题数</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">42</p>
            </div>
            <Hash className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃话题</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">28</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总回复数</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">1,589</p>
            </div>
            <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">平均热度</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">7.4</p>
            </div>
            <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* 话题列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">话题列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">话题信息</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">关键词</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">回复数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">热度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">最后使用</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topicsData.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-gray-400" />
                        {topic.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">{topic.description}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">创建者: {topic.creator}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {topic.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {topic.keywords.slice(0, 3).map((keyword, index) => (
                        <span key={index} className="inline-flex px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400">
                          {keyword}
                        </span>
                      ))}
                      {topic.keywords.length > 3 && (
                        <span className="inline-flex px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          +{topic.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                      <MessageCircle className="w-4 h-4 mr-1 text-gray-400" />
                      {topic.responseCount}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(topic.popularity / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{topic.popularity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      topic.status === '活跃' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                      topic.status === '普通' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}>
                      {topic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      {topic.lastUsed}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 