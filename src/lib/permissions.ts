export const PERMISSIONS: Record<string, string[]> = {
  // 查看者权限
  'viewer': [
    '/users'
  ],
  
  // 操作员权限
  'operator': [
    '/users', 
    '/topics', 
    '/knowledge', 
    '/test-chat'
  ],

  // 管理员权限
  'admin': [
    '/dashboard', 
    '/bots', 
    '/prompts', 
    '/knowledge', 
    '/topics', 
    '/users', 
    '/settings', 
    '/test-chat'
  ],

  // 超级管理员权限
  'super_admin': [
    '/dashboard', 
    '/bots', 
    '/prompts', 
    '/knowledge', 
    '/topics', 
    '/users', 
    '/settings', 
    '/test-chat'
  ],
}; 