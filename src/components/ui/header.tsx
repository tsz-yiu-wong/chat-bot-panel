'use client'

import { LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { clearCurrentUser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/lib/supabase'

interface HeaderProps {
  user?: AdminUser | null
}

export function Header({ user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'operator': '操作员',
      'viewer': '查看者'
    }
    return roleNames[role] || role
  }

  const handleLogout = () => {
    clearCurrentUser()
    setShowUserMenu(false)
    router.push('/')
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-[var(--component-background)]">
      <header className="h-16 px-4 flex items-center border-b border-gray-200 dark:border-[var(--border-color)] transition-colors duration-150">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4 ml-auto">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors duration-150"
              >
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.username || '加载中...'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user ? getRoleDisplayName(user.role) : ''}
                  </p>
                </div>
              </button>

              {/* 用户菜单 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[var(--component-background)] rounded-lg shadow-lg border border-gray-200 dark:border-[var(--border-color)] py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-[var(--border-color)]">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 点击外部关闭菜单 */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  )
} 