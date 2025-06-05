-- 给 prompts 表添加 name 字段
ALTER TABLE prompts 
ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';

-- 更新现有记录，为它们设置默认名称
UPDATE prompts 
SET name = CONCAT(
  CASE 
    WHEN stage_name = 'first_meet' THEN '初次见面'
    WHEN stage_name = 'learn_hobbies' THEN '了解爱好'
    WHEN stage_name = 'show_ability' THEN '展示能力'
    WHEN stage_name = 'romance' THEN '恋爱模式'
    ELSE stage_name
  END,
  ' - ',
  model_name
);

-- 移除默认值约束（可选，这样以后创建新记录时必须提供name）
ALTER TABLE prompts 
ALTER COLUMN name DROP DEFAULT; 