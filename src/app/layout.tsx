import type { Metadata } from "next";
import "./globals.css";
import { LayoutContent } from "../components/layout-content";

export const metadata: Metadata = {
  title: "chatbot后台",
  description: "聊天机器人后台管理系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
