-- 用户管理模块数据库结构
-- 包含用户表、验证函数、初始化数据和管理工具

-- ===== 基础结构 =====
-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表 (后台登录用户)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer')),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ===== 函数定义 =====
-- 用户密码验证函数
CREATE OR REPLACE FUNCTION verify_user_password(input_username TEXT, input_password TEXT)
RETURNS TABLE(user_id UUID, username VARCHAR, role VARCHAR, email VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.username, u.role, u.email
    FROM users u
    WHERE u.username = input_username
    AND u.password_hash = crypt(input_password, u.password_hash);
END;
$$;

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为用户表创建更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 初始化数据 =====
-- 插入不同权限级别的用户账号（仅在用户表为空时执行）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (username, password_hash, role, email) VALUES 
            -- 超级管理员 (用户名: superadmin, 密码: super123456)
            ('superadmin', crypt('super123456', gen_salt('bf', 12)), 'super_admin', 'superadmin@example.com'),
            
            -- 管理员 (用户名: admin, 密码: admin123456)
            ('admin', crypt('admin123456', gen_salt('bf', 12)), 'admin', 'admin@example.com'),
            
            -- 操作员 (用户名: operator, 密码: operator123)
            ('operator', crypt('operator123', gen_salt('bf', 12)), 'operator', 'operator@example.com'),
            
            -- 查看者 (用户名: viewer, 密码: viewer123)
            ('viewer', crypt('viewer123', gen_salt('bf', 12)), 'viewer', 'viewer@example.com');
            
        RAISE NOTICE '已插入初始用户账号';
    ELSE
        RAISE NOTICE '用户表不为空，跳过初始化数据';
    END IF;
END
$$;

-- ===== 用户管理工具 =====
/*
用户账号添加模板
使用说明：
1. 将 'xxx' 替换为实际的用户名
2. 将 'yyy' 替换为实际的密码
3. 选择合适的角色：super_admin, admin, operator, viewer
4. 修改邮箱（可选）
5. 在 Supabase SQL Editor 中运行此脚本

示例添加新用户：
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
    email,
    created_at
FROM users 
WHERE username = 'xxx'  -- 替换为实际用户名
ORDER BY user_id;
*/

-- ===== 验证和查询 =====
-- 显示当前所有用户账号信息
SELECT 
    username,
    role,
    email,
    created_at
FROM users 
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'operator' THEN 3
        WHEN 'viewer' THEN 4
    END,
    created_at; 