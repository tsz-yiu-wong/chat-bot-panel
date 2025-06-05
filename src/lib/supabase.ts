import { createClient } from '@supabase/supabase-js'

// 检查Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// 初始化Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types
export interface AdminUser {
  user_id: string
  username: string
  password_hash: string
  role: 'super_admin' | 'admin' | 'operator' | 'viewer'
  email?: string
}

export interface Bot {
  bot_id: string
  name: string
  persona_description: string
  system_prompt_template: string
  created_at: string
  updated_at: string
}

export interface User {
  user_id: string
  external_user_id: string
  created_at: string
  updated_at: string
}

export interface UserTag {
  tag_id: string
  tag_name: string
}

export interface Prompt {
  prompt_id: string
  bot_id?: string
  stage_name: string
  prompt_text_template: string
  conditions: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ChatHistory {
  message_id: string
  session_id: string
  user_id: string
  bot_id: string
  sender_type: 'user' | 'bot'
  message_text: string
  timestamp: string
  chat_stage: string
  metadata: Record<string, unknown>
}

export interface ChatEmbedding {
  embedding_id: string
  message_id: string
  embedding_vector: number[]
  text_content_hash?: string
  created_at: string
}

// 认证相关接口
export interface LoginResult {
  user_id: string
  username: string
  role: 'super_admin' | 'admin' | 'operator' | 'viewer'
  email?: string
}

export interface RpcResponse {
  data: AdminUser[] | null
  error: Error | null
}

// 登录用户
export async function loginUser(username: string, password: string): Promise<AdminUser[] | null> {
  // 如果有Supabase配置，尝试使用真实数据库
  if (supabase) {
    try {
      // 调用数据库函数进行密码验证
      const response = await supabase.rpc('verify_user_password', {
        input_username: username,
        input_password: password
      }) as RpcResponse

      if (response.error) {
        throw response.error
      }

      return response.data as AdminUser[]
    } catch (error) {
      throw error
    }
  } else {
    // 模拟登录模式
    const mockUsers: AdminUser[] = [
      { user_id: '1', username: 'superadmin', email: 'superadmin@example.com', role: 'super_admin', password_hash: 'super123456' },
      { user_id: '2', username: 'admin', email: 'admin@example.com', role: 'admin', password_hash: 'admin123456' },
      { user_id: '3', username: 'operator', email: 'operator@example.com', role: 'operator', password_hash: 'operator123' },
      { user_id: '4', username: 'viewer', email: 'viewer@example.com', role: 'viewer', password_hash: 'viewer123' }
    ]
    
    const user = mockUsers.find(u => u.username === username && u.password_hash === password)
    return user ? [user] : null
  }
}

export function getCurrentUser(): AdminUser | null {
  // 从localStorage获取用户信息
  if (typeof window === 'undefined') {
    return null
  }
  
  const userStr = localStorage.getItem('currentUser')
  if (!userStr) {
    return null
  }
  
  try {
    const user = JSON.parse(userStr) as AdminUser
    return user
  } catch {
    return null
  }
}

export function setCurrentUser(user: AdminUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('currentUser')
}

// 权限检查
export function checkPermission(userRole: string, requiredPage: string): boolean {
  const permissions: Record<string, string[]> = {
    'viewer': ['/users'],
    'operator': ['/users', '/topics', '/knowledge'],
    'admin': ['/dashboard', '/bots', '/prompts', '/knowledge', '/topics', '/users', '/settings'],
    'super_admin': ['/dashboard', '/bots', '/prompts', '/knowledge', '/topics', '/users', '/settings']
  }
  
  const allowedPages = permissions[userRole] || []
  return allowedPages.includes(requiredPage)
} 