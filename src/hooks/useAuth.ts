'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentUser, clearCurrentUser, checkPermission, type AdminUser } from '@/lib/supabase'
import { PERMISSIONS } from '@/lib/permissions';

export function useAuth(requireAuth: boolean = true) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const effectCountRef = useRef(0)

  useEffect(() => {
    effectCountRef.current += 1
    const currentCount = effectCountRef.current
    
    // 防止无限循环的断路器
    if (currentCount > 10) {
      setLoading(false)
      return
    }
    
    // 如果在登录页面
    if (pathname === '/') {
      const currentUser = getCurrentUser()
      
      if (currentUser) {
        // 已登录用户访问登录页，重定向到对应页面
        const allowedPage = getFirstAllowedPage(currentUser.role)
        router.push(allowedPage)
        return
      }
      
      setUser(null)
      setLoading(false)
      return
    }

    // 非登录页面的检查
    const currentUser = getCurrentUser()
    
    if (!currentUser && requireAuth) {
      // 未登录且需要认证，跳转到登录页
      router.push('/')
      return
    }
    
    if (currentUser) {
      // 已登录，检查权限
      const hasPermission = checkPermission(currentUser.role, pathname)
      
      if (!hasPermission) {
        // 没有权限，跳转到有权限的页面
        const allowedPage = getFirstAllowedPage(currentUser.role)
        if (allowedPage && allowedPage !== pathname) {
          router.push(allowedPage)
          return
        }
      }
    }
    
    setUser(currentUser)
    setLoading(false)
  }, [pathname, router, requireAuth])

  // 重置计数器当pathname改变时
  useEffect(() => {
    effectCountRef.current = 0
  }, [pathname])

  const logout = () => {
    clearCurrentUser()
    setUser(null)
    router.push('/')
  }

  return {
    user,
    loading,
    logout,
    isAuthenticated: !!user
  }
}

function getFirstAllowedPage(role: string): string {
  const allowedPages = PERMISSIONS[role] || []
  const result = allowedPages[0] || '/users'
  return result
} 