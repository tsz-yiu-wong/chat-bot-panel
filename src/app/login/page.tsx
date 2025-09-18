"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Eye, EyeOff, Bot } from "lucide-react";

// Placeholder BotIcon component
const BotIcon = () => (
    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
      <Bot className="w-8 h-8 text-white" />
    </div>
  );


export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      // 登录成功后，让中间件处理基于角色的重定向
      window.location.href = "/";
    } else {
      const data = await response.json();
      setError(data.error || "An unexpected error occurred.");
    }

    setLoading(false);
  };

  return (
    <main className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="flex flex-col items-center space-y-6 w-full max-w-md px-4">
        <BotIcon />
        <Card className="w-full p-4">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2 mb-8">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-10 mt-3 h-11"
                />
              </div>
            </div>
            <div className="space-y-2 mb-8">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 mt-3 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
        <form onSubmit={handleSubmit} className="flex justify-center w-full">
          <Button
            type="submit"
            className="w-1/2 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </div>
    </main>
  );
}
