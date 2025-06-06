'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  SunMoon,
  BookOpen,
  Hash
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { AdminUser } from '@/lib/supabase'

const allNavigation = [
  { name: '仪表板', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
  { name: '机器人', href: '/bots', icon: Bot, roles: ['admin', 'super_admin'] },
  { name: 'prompts', href: '/prompts', icon: MessageSquare, roles: ['admin', 'super_admin'] },
  { name: '知识库', href: '/knowledge', icon: BookOpen, roles: ['operator', 'admin', 'super_admin'] },
  { name: '话题库', href: '/topics', icon: Hash, roles: ['operator', 'admin', 'super_admin'] },
  { name: '用户', href: '/users', icon: Users, roles: ['viewer', 'operator', 'admin', 'super_admin'] },
  { name: '设置', href: '/settings', icon: Settings, roles: ['admin', 'super_admin'] },
]

const themes = [
  { name: 'light', icon: Sun, label: '浅色' },
  { name: 'dark', icon: Moon, label: '深色' },
  { name: 'system', icon: SunMoon, label: '跟随系统' },
]

interface SidebarProps {
  user?: AdminUser | null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>('system')
  const [mounted, setMounted] = useState(false)

  // 根据用户权限过滤导航菜单
  const navigation = allNavigation.filter(item => 
    user && item.roles.includes(user.role)
  )

  // 初始化
  useEffect(() => {
    setMounted(true)
    
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('theme') || 'system'
    setCurrentTheme(savedTheme)
    
    // 立即应用主题
    applyTheme(savedTheme)
  }, [])

  // 应用主题到DOM
  const applyTheme = (theme: string) => {
    const root = document.documentElement
    
    // 清除所有主题类
    root.classList.remove('dark')
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      // Tailwind 默认是浅色，不需要添加类
    } else {
      // system
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        root.classList.add('dark')
      }
    }
  }

  // 处理主题切换
  const handleThemeChange = (theme: string) => {
    if (!mounted) {
      return
    }
    
    setCurrentTheme(theme)
    localStorage.setItem('theme', theme)
    applyTheme(theme)
  }

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted || currentTheme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (currentTheme === 'system') {
        applyTheme('system')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [currentTheme, mounted])

  return (
    <div className={cn(
      "h-screen", 
      "bg-white dark:bg-[var(--component-background)] border-r border-gray-200 dark:border-[var(--border-color)] transition-all duration-150 flex flex-col",
      collapsed ? "w-16" : "w-36"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-[var(--border-color)] transition-colors duration-150">
        {!collapsed && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">后台管理</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors duration-150 flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 mt-8 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-150",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
                  )}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 h-5 w-5 transition-colors duration-150",
                      isActive ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400",
                      collapsed ? "mr-0" : "mr-3"
                    )}
                  />
                  <span className={cn(
                    "transition-all duration-150 whitespace-nowrap",
                    collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                  )}>
                    {item.name}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 主题切换 */}
      <div className="p-3 border-t border-gray-200 dark:border-[var(--border-color)] transition-colors duration-150">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-1">
            {mounted && themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                className={cn(
                  "p-2 rounded-lg transition-colors duration-150 flex-shrink-0 cursor-pointer",
                  currentTheme === theme.name
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                )}
                title={theme.label}
              >
                <theme.icon className="h-4 w-4" />
              </button>
            ))}
            {!mounted && (
              <div className="p-2 rounded-lg text-gray-400">
                <SunMoon className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 