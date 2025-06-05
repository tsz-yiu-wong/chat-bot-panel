'use client'

import { AlertCircle } from 'lucide-react'

export default function ComingSoon() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
          <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          暂未开放
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          该页面正在开发中...
        </p>
      </div>
    </div>
  )
} 