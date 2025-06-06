-- 给 prompts 表添加 name 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'name'
    ) THEN
        ALTER TABLE prompts 
        ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
END $$;

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

-- 移除默认值约束（如果存在的话）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prompts' AND column_name = 'name' AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE prompts ALTER COLUMN name DROP DEFAULT;
    END IF;
END $$; 