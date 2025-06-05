'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/ui/sidebar'
import { Header } from '@/components/ui/header'
import LoginPage from '@/app/page'
import { useAuth } from '@/hooks/useAuth'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 如果是登录页面，直接显示登录页面
  if (pathname === '/') {
    return <LoginPage />
  }

  // 其他页面显示完整布局
  return <LayoutWithAuth>{children}</LayoutWithAuth>
}

function LayoutWithAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  // 正在加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 渲染完整布局
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 