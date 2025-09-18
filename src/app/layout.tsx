import { headers } from 'next/headers';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import I18nProvider from '@/components/i18n-provider';
import { AppShell } from '@/components/layout/app-shell';
import { UserProvider } from '@/components/user-context';
import { getCurrentUser, type UserProfile } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: 'swap', // 优化字体加载，防止布局偏移
  preload: true, // 预加载字体
});

export const metadata: Metadata = {
  title: "聊天机器人管理面板",
  description: "新一代聊天机器人后台管理系统",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  const userProfile = await getCurrentUser();
  const userRole = userProfile?.role || null;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserProvider initialRole={userRole} initialProfile={userProfile}>
              <div className="relative flex h-screen flex-col overflow-hidden">
                <AppShell>{children}</AppShell>
              </div>
            </UserProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
