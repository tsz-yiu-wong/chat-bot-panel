-- 话题管理模块数据库结构
-- 包含三级分类：大类、小类、具体问题

-- ===== 基础扩展 =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 核心表结构 =====
-- 1. 创建话题大类表
CREATE TABLE IF NOT EXISTS topic_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_cn VARCHAR(255),
    name_vn VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建话题小类表
CREATE TABLE IF NOT EXISTS topic_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES topic_categories(id) ON DELETE CASCADE,
    name_cn VARCHAR(255),
    name_vn VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建话题表
CREATE TABLE IF NOT EXISTS topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES topic_categories(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES topic_subcategories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 数据库结构更新 =====
-- 如果表已存在，则修改字段约束
ALTER TABLE topic_categories ALTER COLUMN name_cn DROP NOT NULL;
ALTER TABLE topic_subcategories ALTER COLUMN name_cn DROP NOT NULL;

-- ===== 索引优化 =====
-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_topic_categories_sort_order ON topic_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_topic_subcategories_category_id ON topic_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_topic_subcategories_sort_order ON topic_subcategories(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_topics_category_id ON topics(category_id);
CREATE INDEX IF NOT EXISTS idx_topics_subcategory_id ON topics(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_topics_sort_order ON topics(subcategory_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_topics_usage_count ON topics(usage_count DESC);

-- ===== 触发器函数 =====
-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为各表创建更新时间触发器
DROP TRIGGER IF EXISTS update_topic_categories_updated_at ON topic_categories;
CREATE TRIGGER update_topic_categories_updated_at 
    BEFORE UPDATE ON topic_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topic_subcategories_updated_at ON topic_subcategories;
CREATE TRIGGER update_topic_subcategories_updated_at 
    BEFORE UPDATE ON topic_subcategories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at 
    BEFORE UPDATE ON topics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 初始化数据 =====
-- 添加示例数据（仅在表为空时执行）
DO $$
BEGIN
    -- 检查并插入大类数据
    IF NOT EXISTS (SELECT 1 FROM topic_categories LIMIT 1) THEN
        INSERT INTO topic_categories (name_cn, name_vn, sort_order) VALUES 
        ('兴趣爱好', 'Sở thích', 1000),
        ('生活工作', 'Cuộc sống và công việc', 1001),
        ('情感关系', 'Tình cảm và mối quan hệ', 1002);
        
        RAISE NOTICE '已插入话题大类示例数据';
    END IF;
    
    -- 检查并插入小类数据
    IF NOT EXISTS (SELECT 1 FROM topic_subcategories LIMIT 1) THEN
        INSERT INTO topic_subcategories (category_id, name_cn, name_vn, sort_order) VALUES 
        ((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'), '运动健身', 'Thể thao và sức khỏe', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'), '音乐艺术', 'Âm nhạc và nghệ thuật', 1001),
        ((SELECT id FROM topic_categories WHERE name_cn = '生活工作'), '职业规划', 'Quy hoạch nghề nghiệp', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '生活工作'), '日常生活', 'Cuộc sống hàng ngày', 1001),
        ((SELECT id FROM topic_categories WHERE name_cn = '情感关系'), '友情', 'Tình bạn', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '情感关系'), '爱情', 'Tình yêu', 1001);
        
        RAISE NOTICE '已插入话题小类示例数据';
    END IF;
    
    -- 检查并插入话题数据
    IF NOT EXISTS (SELECT 1 FROM topics LIMIT 1) THEN
        INSERT INTO topics (category_id, subcategory_id, content, sort_order) VALUES 
        ((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'),
         (SELECT id FROM topic_subcategories WHERE name_cn = '运动健身'),
         '你平时喜欢做什么运动？为什么选择这项运动？', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'),
         (SELECT id FROM topic_subcategories WHERE name_cn = '音乐艺术'),
         '你最喜欢什么类型的音乐？有没有特别喜欢的歌手或乐队？', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '生活工作'),
         (SELECT id FROM topic_subcategories WHERE name_cn = '职业规划'),
         '你对自己未来的职业发展有什么计划？', 1000),
        ((SELECT id FROM topic_categories WHERE name_cn = '情感关系'),
         (SELECT id FROM topic_subcategories WHERE name_cn = '友情'),
         '你觉得真正的友谊应该是什么样的？', 1000);
         
        RAISE NOTICE '已插入话题示例数据';
    END IF;
END
$$;

-- ===== 数据维护功能 =====
-- 更新现有话题库数据的排序值从1000开始
-- 这样可以方便在现有项目前面插入新的项目

-- 更新大类的排序值
UPDATE topic_categories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- 更新小类的排序值  
UPDATE topic_subcategories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- 更新话题的排序值
UPDATE topics 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- ===== 验证和查询 =====
-- 验证更新结果
SELECT 'topic_categories' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topic_categories
UNION ALL
SELECT 'topic_subcategories' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topic_subcategories
UNION ALL
SELECT 'topics' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topics
ORDER BY table_name; 