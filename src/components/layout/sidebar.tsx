'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Gauge,
  HardDrive,
  MessageSquareQuote,
  Settings,
  ShieldQuestion,
  BookUser,
  FileText,
  Users,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';

// TODO: Integrate user and permission logic
// interface AdminUser {
//   role: 'super_admin' | 'admin' | 'operator' | 'viewer';
// }

const navItems = [
  { href: '/dashboard', icon: Gauge, label: '仪表盘' },
  { href: '/bots', icon: Bot, label: '人设' },
  { href: '/prompts', icon: MessageSquareQuote, label: '提示词' },
  { href: '/knowledge', icon: FileText, label: '知识库' },
  { href: '/topics', icon: BookUser, label: '话题库' },
  { href: '/users', icon: Users, label: '用户管理' },
  { href: '/test-chat', icon: ShieldQuestion, label: '聊天测试' },
  // Add the new UI showcase page for development
  { href: '/ui', icon: HardDrive, label: 'UI组件' },
];

export function Sidebar() {
  const pathname = usePathname();
  // const user: AdminUser | null = { role: 'super_admin' }; // Placeholder for user data

  // const checkPermission = (requiredRole: string) => {
  //   if (!user) return false;
  //   const roles = ['viewer', 'operator', 'admin', 'super_admin'];
  //   const userLevel = roles.indexOf(user.role);
  //   const requiredLevel = roles.indexOf(requiredRole);
  //   return userLevel >= requiredLevel;
  // };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-40 flex-col border-r bg-card sm:flex">
      <nav className="flex flex-col gap-2 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">后台</h1>
        </div>

        {navItems.map((item) => {
          // const hasPermission = checkPermission(item.requiredRole);
          // if (!hasPermission) return null;

          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:bg-muted',
                isActive && 'bg-muted text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-4 p-4">
        <ThemeToggle />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">[用户名]</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            // onClick={() => console.log('logout')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
