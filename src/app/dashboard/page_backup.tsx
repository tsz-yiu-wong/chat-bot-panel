'use client'

import { Bot, Users, MessageSquare, Activity, TrendingUp, TrendingDown } from 'lucide-react'

const stats = [
  {
    name: '机器人总数',
    value: '12',
    change: '+2',
    changeType: 'increase',
    icon: Bot,
  },
  {
    name: '活跃用户',
    value: '1,234',
    change: '+18%',
    changeType: 'increase',
    icon: Users,
  },
  {
    name: '今日对话',
    value: '3,456',
    change: '-2%',
    changeType: 'decrease',
    icon: MessageSquare,
  },
  {
    name: '系统状态',
    value: '99.9%',
    change: '正常',
    changeType: 'stable',
    icon: Activity,
  },
]

const recentActivities = [
  { id: 1, action: '创建了新机器人', bot: '客服机器人v2', time: '2分钟前', type: 'bot' },
  { id: 2, action: '更新了提示词', prompt: '问候语模板', time: '15分钟前', type: 'prompt' },
  { id: 3, action: '新用户注册', user: 'user_12345', time: '1小时前', type: 'user' },
  { id: 4, action: '机器人响应异常', bot: '技术支持机器人', time: '2小时前', type: 'error' },
]

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">仪表板</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">欢迎使用聊天机器人管理系统</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stat.value}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {stat.changeType === 'increase' && (
                <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400 mr-1" />
              )}
              {stat.changeType === 'decrease' && (
                <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 
                  stat.changeType === 'decrease' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">较上周</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近活动 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">最近活动</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'bot' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      activity.type === 'prompt' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      activity.type === 'user' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                      'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {activity.type === 'bot' && <Bot className="w-4 h-4" />}
                      {activity.type === 'prompt' && <MessageSquare className="w-4 h-4" />}
                      {activity.type === 'user' && <Users className="w-4 h-4" />}
                      {activity.type === 'error' && <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {activity.action}
                        {activity.bot && <span className="font-medium"> {activity.bot}</span>}
                        {activity.prompt && <span className="font-medium"> {activity.prompt}</span>}
                        {activity.user && <span className="font-medium"> {activity.user}</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">快速操作</h2>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">创建新机器人</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">添加提示词</span>
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">管理用户</span>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">系统健康度</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>API响应</span>
                <span>99.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>数据库</span>
                <span>正常</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>向量搜索</span>
                <span>正常</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 