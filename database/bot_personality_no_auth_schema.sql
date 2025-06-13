-- Bot Personality Management Schema (No Auth)
-- 机器人人设管理数据库表结构 - 无用户认证版本

-- 首先删除现有的外键约束和RLS策略
ALTER TABLE bot_images DROP CONSTRAINT IF EXISTS bot_images_bot_id_fkey;
ALTER TABLE bot_personalities DROP CONSTRAINT IF EXISTS bot_personalities_user_id_fkey;

-- 删除RLS策略
DROP POLICY IF EXISTS "Users can view their own bot personalities" ON bot_personalities;
DROP POLICY IF EXISTS "Users can insert their own bot personalities" ON bot_personalities;
DROP POLICY IF EXISTS "Users can update their own bot personalities" ON bot_personalities;
DROP POLICY IF EXISTS "Users can delete their own bot personalities" ON bot_personalities;

DROP POLICY IF EXISTS "Users can view their bot images" ON bot_images;
DROP POLICY IF EXISTS "Users can insert their bot images" ON bot_images;
DROP POLICY IF EXISTS "Users can update their bot images" ON bot_images;
DROP POLICY IF EXISTS "Users can delete their bot images" ON bot_images;

-- 禁用RLS
ALTER TABLE bot_personalities DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_images DISABLE ROW LEVEL SECURITY;

-- 删除user_id相关索引
DROP INDEX IF EXISTS idx_bot_personalities_user_id;

-- 修改表结构：将user_id改为可选字段
ALTER TABLE bot_personalities ALTER COLUMN user_id DROP NOT NULL;

-- 重新创建外键约束（只有bot_images到bot_personalities的关联）
ALTER TABLE bot_images 
ADD CONSTRAINT bot_images_bot_id_fkey 
FOREIGN KEY (bot_id) REFERENCES bot_personalities(id) ON DELETE CASCADE;

-- 保留其他有用的索引
-- CREATE INDEX idx_bot_personalities_active ON bot_personalities(is_active); -- 已存在
-- CREATE INDEX idx_bot_images_bot_id ON bot_images(bot_id); -- 已存在
-- CREATE INDEX idx_bot_images_type ON bot_images(image_type); -- 已存在

-- 更新时间触发器保持不变（已存在）
-- CREATE TRIGGER update_bot_personalities_updated_at...

-- 为了向后兼容，添加一个简单的唯一约束用于区分机器人
-- ALTER TABLE bot_personalities ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'system';
-- CREATE INDEX IF NOT EXISTS idx_bot_personalities_created_by ON bot_personalities(created_by);

COMMIT; 