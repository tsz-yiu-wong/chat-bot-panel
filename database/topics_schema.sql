-- 话题库数据库结构
-- 包含三级分类：大类、小类、具体问题

-- 1. 创建话题大类表
CREATE TABLE topic_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_cn VARCHAR(255) NOT NULL,
    name_vn VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建话题小类表
CREATE TABLE topic_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES topic_categories(id) ON DELETE CASCADE,
    name_cn VARCHAR(255) NOT NULL,
    name_vn VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建话题表
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES topic_categories(id) ON DELETE CASCADE,
    subcategory_id UUID NOT NULL REFERENCES topic_subcategories(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_topic_categories_sort_order ON topic_categories(sort_order);
CREATE INDEX idx_topic_subcategories_category_id ON topic_subcategories(category_id);
CREATE INDEX idx_topic_subcategories_sort_order ON topic_subcategories(category_id, sort_order);
CREATE INDEX idx_topics_category_id ON topics(category_id);
CREATE INDEX idx_topics_subcategory_id ON topics(subcategory_id);
CREATE INDEX idx_topics_sort_order ON topics(subcategory_id, sort_order);
CREATE INDEX idx_topics_usage_count ON topics(usage_count DESC);

-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_topic_categories_updated_at 
    BEFORE UPDATE ON topic_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_subcategories_updated_at 
    BEFORE UPDATE ON topic_subcategories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at 
    BEFORE UPDATE ON topics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加示例数据
INSERT INTO topic_categories (name_cn, name_vn, sort_order) VALUES 
('兴趣爱好', 'Sở thích', 1000),
('生活工作', 'Cuộc sống và công việc', 1001),
('情感关系', 'Tình cảm và mối quan hệ', 1002);

INSERT INTO topic_subcategories (category_id, name_cn, name_vn, sort_order) VALUES 
((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'), '运动健身', 'Thể thao và sức khỏe', 1000),
((SELECT id FROM topic_categories WHERE name_cn = '兴趣爱好'), '音乐艺术', 'Âm nhạc và nghệ thuật', 1001),
((SELECT id FROM topic_categories WHERE name_cn = '生活工作'), '职业规划', 'Quy hoạch nghề nghiệp', 1000),
((SELECT id FROM topic_categories WHERE name_cn = '生活工作'), '日常生活', 'Cuộc sống hàng ngày', 1001),
((SELECT id FROM topic_categories WHERE name_cn = '情感关系'), '友情', 'Tình bạn', 1000),
((SELECT id FROM topic_categories WHERE name_cn = '情感关系'), '爱情', 'Tình yêu', 1001);

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

-- 如果需要添加sort_order字段到现有表，使用以下语句：
-- ALTER TABLE topic_categories ADD COLUMN sort_order INTEGER DEFAULT 1000;
-- ALTER TABLE topic_subcategories ADD COLUMN sort_order INTEGER DEFAULT 1000;
-- ALTER TABLE topics ADD COLUMN sort_order INTEGER DEFAULT 1000;

-- 更新现有数据的排序值（如果表中已有数据）
-- 将现有数据的sort_order从1000开始
-- UPDATE topic_categories SET sort_order = subq.rn + 999
-- FROM (
--   SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn 
--   FROM topic_categories
-- ) subq 
-- WHERE topic_categories.id = subq.id;

-- UPDATE topic_subcategories SET sort_order = subq.rn + 999
-- FROM (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) as rn 
--   FROM topic_subcategories
-- ) subq 
-- WHERE topic_subcategories.id = subq.id;

-- UPDATE topics SET sort_order = subq.rn + 999
-- FROM (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY subcategory_id ORDER BY created_at) as rn 
--   FROM topics
-- ) subq 
-- WHERE topics.id = subq.id;

-- 单独运行的更新语句（如果需要立即更新现有数据）：

-- 更新现有数据的默认值为从1000开始
UPDATE topic_categories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

UPDATE topic_subcategories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

UPDATE topics 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000; 