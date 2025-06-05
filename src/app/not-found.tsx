import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-150">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">页面未找到</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">抱歉，您访问的页面不存在或已被移动。</p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-150"
          >
            <Home className="w-4 h-4 mr-2" />
            返回仪表板
          </Link>
          
          <div className="block">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-lg transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回上一页
            </button>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>如果您认为这是一个错误，请联系系统管理员。</p>
        </div>
      </div>
    </div>
  )
} 