-- 用户账号添加模板
-- 使用说明：
-- 1. 将 'xxx' 替换为实际的用户名
-- 2. 将 'yyy' 替换为实际的密码
-- 3. 选择合适的角色：super_admin, admin, operator, viewer
-- 4. 修改邮箱（可选）
-- 5. 在 Supabase SQL Editor 中运行此脚本

-- 使用 PostgreSQL 的 crypt 函数加密密码
-- 注意：需要启用 pgcrypto 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO users (
    username, 
    password_hash, 
    role, 
    email
) VALUES (
    'xxx',                                      -- 替换为实际用户名
    crypt('yyy', gen_salt('bf', 12)),          -- 替换为实际密码，使用 bcrypt 加密
    'admin',                                    -- 角色：super_admin, admin, operator, viewer
    'admin@example.com'                        -- 邮箱（可选）
);

-- 验证插入结果
SELECT 
    user_id,
    username,
    role,
    email
FROM users 
WHERE username = 'xxx'  -- 替换为实际用户名
ORDER BY user_id; 