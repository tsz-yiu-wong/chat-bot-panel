'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bot,
  Gauge,
  Users,
  MessageSquareQuote,
  BookOpen,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ShieldQuestion,
  Settings,
  LogOut,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import { UserMenu } from './user-menu';
import { useTranslation } from 'react-i18next';
import { useMounted } from '@/hooks/use-mounted';
import { getMenuItems, type UserRole, MENU_CONFIG } from '@/lib/permissions';
import { useUser } from '@/components/user-context';

// 图标映射
const iconMap = {
  Gauge,
  Users,
  Bot,
  MessageSquareQuote,
  BookOpen,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ShieldQuestion,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isMounted = useMounted();
  const { userRole, loading } = useUser();

  // 如果还在加载中，显示骨架屏
  if (loading || !userRole) {
    return (
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-46 flex-col border-r bg-card sm:flex">
        <nav className="flex flex-col gap-2 p-4">
          <div className="mb-2 flex justify-center">
            <Bot className="h-12 w-12 text-primary" />
          </div>
          {/* 骨架屏 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-4 p-4">
          <ThemeToggle />
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            <LanguageToggle />
          </div>
        </div>
      </aside>
    );
  }

  // 根据用户角色获取菜单项
  const menuItems = getMenuItems(userRole);

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-46 flex-col border-r bg-card sm:flex">
      <nav className="flex flex-col gap-2 p-4">
        <div className="mb-2 flex justify-center">
          <Bot className="h-12 w-12 text-primary" />
        </div>

        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const defaultLabel = Object.values(MENU_CONFIG).find(mc => mc.key === item.key)?.label || '';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:bg-muted border-r-4 border-transparent',
                isActive && 'bg-primary/10 dark:bg-primary/20 text-primary border-primary font-semibold'
              )}
            >
              {/* 为图标添加 flex-shrink-0 以防止其在文本过长时被压缩 */}
              <Icon className="h-5 w-5 flex-shrink-0" />
              {isMounted ? t(item.labelKey) : defaultLabel}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-4 p-4">
        <ThemeToggle />

        <div className="flex items-center justify-between">
          <UserMenu className="ml-2 text-foreground" />
          <LanguageToggle />
        </div>
      </div>
    </aside>
  );
}
