'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !pathname.startsWith('/login');

  if (!showSidebar) {
    // For pages without sidebar, like login page
    return <main className="p-6">{children}</main>;
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
