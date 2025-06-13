-- Bot Personality Management Schema
-- 机器人人设管理数据库表结构

-- 机器人人设主表
CREATE TABLE bot_personalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bot_name VARCHAR(100) NOT NULL,
    
    -- Basic Information 基础信息
    nationality VARCHAR(50),
    age INTEGER,
    gender VARCHAR(20),
    height VARCHAR(20),
    weight VARCHAR(20),
    blood_type VARCHAR(10),
    zodiac_sign VARCHAR(20),
    birth_date DATE,
    birth_place TEXT,
    current_address TEXT,
    current_job TEXT,
    work_address TEXT,
    
    -- Lifestyle 作息和生活习惯
    daily_routine JSONB, -- {wake_up, breakfast, lunch, dinner, work_hours, rest_time, vacation}
    
    -- Preferences 喜好
    favorite_music TEXT,
    favorite_movies TEXT,
    favorite_fashion TEXT,
    favorite_hairstyle TEXT,
    favorite_food TEXT,
    favorite_restaurants TEXT,
    
    -- Education 教育背景
    education_level VARCHAR(100),
    graduate_school TEXT,
    major TEXT,
    
    -- Marriage 婚姻状况
    marital_status VARCHAR(30),
    marriage_history TEXT,
    
    -- Background 背景 (保留旧字段以兼容)
    education_background TEXT,
    
    -- Interests and Values 兴趣和价值观
    hobbies TEXT,
    worldview TEXT,
    life_philosophy TEXT,
    values TEXT,
    
    -- Life Timeline and Family 人生时间轴和家庭
    life_timeline JSONB, -- 重要人生节点
    family_members JSONB, -- 家庭成员信息
    
    -- Life Experiences 人生经历
    childhood_experience TEXT,
    childhood_stories TEXT,
    growth_experience TEXT,
    relationship_experience TEXT,
    work_experience TEXT,
    business_experience TEXT,
    investment_experience TEXT,
    
    -- Dreams and Future 梦想和未来
    places_to_visit TEXT,
    life_dreams TEXT,
    future_thoughts TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 机器人图片表
CREATE TABLE bot_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bot_personalities(id) ON DELETE CASCADE,
    image_type VARCHAR(30) NOT NULL, -- personal, lifestyle, work, hobby, travel
    image_url TEXT NOT NULL,
    image_name VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_bot_personalities_user_id ON bot_personalities(user_id);
CREATE INDEX idx_bot_personalities_active ON bot_personalities(is_active);
CREATE INDEX idx_bot_images_bot_id ON bot_images(bot_id);
CREATE INDEX idx_bot_images_type ON bot_images(image_type);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_bot_personalities_updated_at
    BEFORE UPDATE ON bot_personalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 启用行级安全
ALTER TABLE bot_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_images ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的机器人人设
CREATE POLICY "Users can view their own bot personalities" ON bot_personalities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bot personalities" ON bot_personalities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bot personalities" ON bot_personalities
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bot personalities" ON bot_personalities
    FOR DELETE USING (auth.uid() = user_id);

-- 图片表的RLS策略
CREATE POLICY "Users can view their bot images" ON bot_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bot_personalities bp 
            WHERE bp.id = bot_images.bot_id AND bp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their bot images" ON bot_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bot_personalities bp 
            WHERE bp.id = bot_images.bot_id AND bp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their bot images" ON bot_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM bot_personalities bp 
            WHERE bp.id = bot_images.bot_id AND bp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their bot images" ON bot_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM bot_personalities bp 
            WHERE bp.id = bot_images.bot_id AND bp.user_id = auth.uid()
        )
    ); 