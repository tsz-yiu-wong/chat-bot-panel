'use client'

import { useState, useCallback } from 'react'
import { Eye, EyeOff, Bot, Lock, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { loginUser, setCurrentUser } from '@/lib/supabase'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const router = useRouter()

  const getFirstAllowedPage = useCallback((role: string): string => {
    const permissions: Record<string, string[]> = {
      'viewer': ['/users'],
      'operator': ['/users', '/topics', '/knowledge'],
      'admin': ['/dashboard', '/bots', '/prompts', '/knowledge', '/topics', '/users', '/settings'],
      'super_admin': ['/dashboard', '/bots', '/prompts', '/knowledge', '/topics', '/users', '/settings']
    }
    const allowedPages = permissions[role] || []
    const result = allowedPages[0] || '/users'
    return result
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const userData = await loginUser(formData.username, formData.password)
      
      if (userData && userData.length > 0) {
        const user = userData[0]
        
        // 保存用户信息到localStorage
        setCurrentUser({
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          email: user.email,
          password_hash: '' // 不保存密码哈希
        })
        
        // 根据用户角色跳转到对应页面
        const targetPage = getFirstAllowedPage(user.role)
        router.push(targetPage)
      } else {
        setError('用户名或密码错误')
      }
    } catch {
      setError('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }, [formData.username, formData.password, getFirstAllowedPage, router])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除错误信息
    if (error) setError('')
  }, [error])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-150">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* 登录表单 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 transition-colors duration-150">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误信息 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-150"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-150"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-150 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
