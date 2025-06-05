'use client'

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 登录页不显示sidebar和header
  const isLoginPage = pathname === '/'
  
  if (isLoginPage) {
    return <>{children}</>
  }
  
  // 其他页面显示完整布局
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-150">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-150">
          {children}
        </main>
      </div>
    </div>
  )
} 