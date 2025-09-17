'use client';

import { useState, useEffect } from 'react';
import { LogOut, User, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase-client';
import { type UserRole } from '@/lib/permissions';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/components/user-context';

interface UserProfile {
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { t } = useTranslation();
  const { userProfile, loading } = useUser();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // 重定向到登录页面
      window.location.href = '/login';
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    return t(`user_menu.roles.${role}`, { defaultValue: role });
  };

  if (loading) {
    return (
      <div className={`h-5 w-16 bg-muted animate-pulse rounded ${className}`} />
    );
  }

  if (!userProfile) {
    return (
      <span className={`text-sm font-medium text-muted-foreground ${className}`}>
        {t('user_menu.unknown_user')}
      </span>
    );
  }

  const displayName = userProfile.full_name || userProfile.username;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground ${className}`}
        >
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" alignOffset={-4} sideOffset={8}>
        <DropdownMenuLabel>{t('user_menu.user_info')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('user_menu.username')}</span>
            <span className="font-medium">{userProfile.username}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('user_menu.role')}</span>
            <span className="font-medium">{getRoleDisplayName(userProfile.role)}</span>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('user_menu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
