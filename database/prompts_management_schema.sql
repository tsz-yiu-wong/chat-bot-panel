-- 提示词管理模块数据库结构
-- 包含AI对话提示词模板管理

-- ===== 基础扩展 =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 核心表结构 =====
-- 创建提示词表（如果不存在）
CREATE TABLE IF NOT EXISTS prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 表结构更新 =====
-- 给 prompts 表添加 name 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'name'
    ) THEN
        ALTER TABLE prompts 
        ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
        
        RAISE NOTICE '已为 prompts 表添加 name 字段';
    ELSE
        RAISE NOTICE 'prompts 表已存在 name 字段，跳过添加';
    END IF;
END $$;

-- ===== 索引优化 =====
-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_prompts_stage_name ON prompts(stage_name);
CREATE INDEX IF NOT EXISTS idx_prompts_model_name ON prompts(model_name);
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);

-- ===== 触发器函数 =====
-- 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为prompts表创建更新时间触发器
DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at 
    BEFORE UPDATE ON prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 数据维护功能 =====
-- 更新现有记录，为它们设置默认名称（仅更新空名称的记录）
UPDATE prompts 
SET name = CONCAT(
  CASE 
    WHEN stage_name = 'first_meet' THEN '初次见面'
    WHEN stage_name = 'learn_hobbies' THEN '了解爱好'
    WHEN stage_name = 'build_intimacy' THEN '加深感情'
    WHEN stage_name = 'romance' THEN '恋爱模式'
    ELSE stage_name
  END,
  ' - ',
  model_name
)
WHERE name = '' OR name IS NULL;

-- 移除name字段的默认值约束（如果存在的话）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'name' AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE prompts ALTER COLUMN name DROP DEFAULT;
        RAISE NOTICE '已移除 prompts.name 字段的默认值约束';
    END IF;
END $$;

-- ===== 验证和查询 =====
-- 显示当前所有提示词信息
SELECT 
    id,
    name,
    stage_name,
    model_name,
    LENGTH(content) as content_length,
    created_at,
    updated_at
FROM prompts 
ORDER BY stage_name, model_name; 