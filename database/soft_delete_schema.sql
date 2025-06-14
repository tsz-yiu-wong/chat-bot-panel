-- 软删除功能：为相关表添加is_deleted字段
-- Created: 2024-12-19

-- 知识库相关表
ALTER TABLE knowledge_abbreviations 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE knowledge_scripts 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 话题库相关表
ALTER TABLE topic_categories 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE topic_subcategories 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE topics 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 提示词表
ALTER TABLE prompts 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 机器人相关表 - 统一软删除字段
-- 注意：bot_personalities表已有is_active字段，我们需要添加is_deleted并迁移数据
ALTER TABLE bot_personalities 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE bot_images 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 数据迁移：将is_active=false的记录标记为已删除
UPDATE bot_personalities SET is_deleted = true WHERE is_active = false;

-- 为性能优化添加索引
CREATE INDEX idx_knowledge_abbreviations_is_deleted ON knowledge_abbreviations(is_deleted);
CREATE INDEX idx_knowledge_scripts_is_deleted ON knowledge_scripts(is_deleted);
CREATE INDEX idx_topic_categories_is_deleted ON topic_categories(is_deleted);
CREATE INDEX idx_topic_subcategories_is_deleted ON topic_subcategories(is_deleted);
CREATE INDEX idx_topics_is_deleted ON topics(is_deleted);
CREATE INDEX idx_prompts_is_deleted ON prompts(is_deleted);
CREATE INDEX idx_bot_personalities_is_deleted ON bot_personalities(is_deleted);
CREATE INDEX idx_bot_images_is_deleted ON bot_images(is_deleted);

-- 复合索引用于级联查询优化
CREATE INDEX idx_topic_subcategories_category_not_deleted ON topic_subcategories(category_id, is_deleted);
CREATE INDEX idx_topics_subcategory_not_deleted ON topics(subcategory_id, is_deleted);
CREATE INDEX idx_topics_category_not_deleted ON topics(category_id, is_deleted);
CREATE INDEX idx_bot_images_bot_not_deleted ON bot_images(bot_id, is_deleted); 