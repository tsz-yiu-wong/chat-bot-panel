'use client'

import { Bell, Shield, Database, Palette } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">设置</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">管理系统配置和偏好设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 通知设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">通知设置</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">邮件通知</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">系统异常通知</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">机器人状态变化</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            </label>
          </div>
        </div>

        {/* 安全设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">安全设置</h2>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">修改密码</span>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">两步验证</span>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">API密钥管理</span>
            </button>
          </div>
        </div>

        {/* 系统设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Database className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">系统设置</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据保留期</label>
              <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>30天</option>
                <option>90天</option>
                <option>1年</option>
                <option>永久</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">备份频率</label>
              <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>每日</option>
                <option>每周</option>
                <option>每月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 外观设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Palette className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">外观设置</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主题</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">主题设置请使用左侧边栏的主题切换按钮</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">语言</label>
              <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option>中文</option>
                <option>English</option>
              </select>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">紧凑模式</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            </label>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="mt-8 flex justify-end">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-150">
          保存设置
        </button>
      </div>
    </div>
  )
} 