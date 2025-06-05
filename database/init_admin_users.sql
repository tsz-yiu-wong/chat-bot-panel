-- 初始化用户账号
-- 创建四种不同权限级别的示例用户账号

-- 启用密码加密扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 清理现有的用户账号（如果需要重新初始化）
-- DELETE FROM users;

-- 插入不同权限级别的用户账号
INSERT INTO users (username, password_hash, role, email) VALUES 
    -- 超级管理员 (用户名: superadmin, 密码: super123456)
    ('superadmin', crypt('super123456', gen_salt('bf', 12)), 'super_admin', 'superadmin@example.com'),
    
    -- 管理员 (用户名: admin, 密码: admin123456)
    ('admin', crypt('admin123456', gen_salt('bf', 12)), 'admin', 'admin@example.com'),
    
    -- 操作员 (用户名: operator, 密码: operator123)
    ('operator', crypt('operator123', gen_salt('bf', 12)), 'operator', 'operator@example.com'),
    
    -- 查看者 (用户名: viewer, 密码: viewer123)
    ('viewer', crypt('viewer123', gen_salt('bf', 12)), 'viewer', 'viewer@example.com');

-- 显示创建的账号信息
SELECT 
    username,
    role,
    email
FROM users 
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'operator' THEN 3
        WHEN 'viewer' THEN 4
    END; 