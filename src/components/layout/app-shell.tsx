'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !pathname.startsWith('/login');

  if (!showSidebar) {
    // 对于登录页面等无侧边栏的页面，直接返回 children 不添加额外的容器和内边距
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="sm:pl-46">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </>
  );
}
