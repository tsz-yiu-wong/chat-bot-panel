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
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

// TODO: Integrate user and permission logic
// interface AdminUser {
//   role: 'super_admin' | 'admin' | 'operator' | 'viewer';
// }

export function Sidebar() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const navItems = [
    { href: '/dashboard', icon: Gauge, label: t('sidebar.dashboard') },
    { href: '/characters', icon: Bot, label: t('sidebar.characters') },
    { href: '/prompts', icon: MessageSquareQuote, label: t('sidebar.prompts') },
    { href: '/knowledge', icon: FileText, label: t('sidebar.knowledge') },
    { href: '/topics', icon: BookUser, label: t('sidebar.topics') },
    { href: '/users', icon: Users, label: t('sidebar.users') },
    { href: '/test-chat', icon: ShieldQuestion, label: t('sidebar.test_chat') },
    // Add the new UI showcase page for development
    { href: '/ui', icon: HardDrive, label: t('sidebar.ui_components') },
  ];
  // const user: AdminUser | null = { role: 'super_admin' }; // Placeholder for user data

  // const checkPermission = (requiredRole: string) => {
  //   if (!user) return false;
  //   const roles = ['viewer', 'operator', 'admin', 'super_admin'];
  //   const userLevel = roles.indexOf(user.role);
  //   const requiredLevel = roles.indexOf(requiredRole);
  //   return userLevel >= requiredLevel;
  // };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-44 flex-col border-r bg-card sm:flex">
      <nav className="flex flex-col gap-2 p-4">
        <div className="mb-2 flex justify-center">
          <Bot className="h-12 w-12 text-primary" />
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:bg-muted border-r-4 border-transparent',
                isActive && 'bg-muted text-primary border-primary'
              )}
            >
              {/* 为图标添加 flex-shrink-0 以防止其在文本过长时被压缩 */}
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-4 p-4">
        <ThemeToggle />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t('user_menu.username_placeholder')}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => changeLanguage('zh')}>
                <span role="img" aria-label="China">
                  🇨🇳
                </span>
                <span className="ml-2">{t('languages.zh')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                <span role="img" aria-label="United States">
                  🇺🇸
                </span>
                <span className="ml-2">{t('languages.en')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('vi')}>
                <span role="img" aria-label="Vietnam">
                  🇻🇳
                </span>
                <span className="ml-2">{t('languages.vi')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
