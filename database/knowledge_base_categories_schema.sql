-- 知识库分类管理数据库结构更新
-- 将缩写库和话术库的分类改为独立表结构，支持多语言（越南文 + 中文）

-- ===== 基础扩展 =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 新增分类表 =====
-- 1. 创建缩写库分类表
CREATE TABLE IF NOT EXISTS knowledge_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_vi VARCHAR(255) NOT NULL,
    name_cn VARCHAR(255),
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建话术库场景表
CREATE TABLE IF NOT EXISTS knowledge_scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_vi VARCHAR(255) NOT NULL,
    name_cn VARCHAR(255),
    sort_order INTEGER DEFAULT 1000,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 数据库结构更新 =====
-- 3. 为现有表添加新的外键字段
ALTER TABLE knowledge_abbreviations ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE knowledge_scripts ADD COLUMN IF NOT EXISTS scenario_id UUID;

-- 4. 添加外键约束（使用DO块来避免重复添加约束的错误）
DO $$
BEGIN
    -- 添加缩写表的分类外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'knowledge_abbreviations' 
        AND constraint_name = 'fk_abbreviations_category'
    ) THEN
        ALTER TABLE knowledge_abbreviations 
        ADD CONSTRAINT fk_abbreviations_category 
        FOREIGN KEY (category_id) REFERENCES knowledge_categories(id) ON DELETE SET NULL;
    END IF;

    -- 添加话术表的场景外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'knowledge_scripts' 
        AND constraint_name = 'fk_scripts_scenario'
    ) THEN
        ALTER TABLE knowledge_scripts 
        ADD CONSTRAINT fk_scripts_scenario 
        FOREIGN KEY (scenario_id) REFERENCES knowledge_scenarios(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- ===== 索引优化 =====
-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_knowledge_categories_sort_order ON knowledge_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_knowledge_categories_is_deleted ON knowledge_categories(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_knowledge_scenarios_sort_order ON knowledge_scenarios(sort_order);
CREATE INDEX IF NOT EXISTS idx_knowledge_scenarios_is_deleted ON knowledge_scenarios(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_abbreviations_category_id ON knowledge_abbreviations(category_id);
CREATE INDEX IF NOT EXISTS idx_scripts_scenario_id ON knowledge_scripts(scenario_id);

-- ===== 触发器函数 =====
-- 创建触发器自动更新 updated_at 字段（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为新表创建更新时间触发器
DROP TRIGGER IF EXISTS update_knowledge_categories_updated_at ON knowledge_categories;
CREATE TRIGGER update_knowledge_categories_updated_at 
    BEFORE UPDATE ON knowledge_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_scenarios_updated_at ON knowledge_scenarios;
CREATE TRIGGER update_knowledge_scenarios_updated_at 
    BEFORE UPDATE ON knowledge_scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 数据迁移 =====
-- 5. 迁移现有分类数据到新表
DO $$
DECLARE
    category_record RECORD;
    scenario_record RECORD;
    new_category_id UUID;
    new_scenario_id UUID;
BEGIN
    -- 迁移缩写库分类
    FOR category_record IN 
        SELECT DISTINCT category FROM knowledge_abbreviations WHERE category IS NOT NULL
    LOOP
        -- 检查分类是否已存在
        SELECT id INTO new_category_id 
        FROM knowledge_categories 
        WHERE name_vi = category_record.category OR name_cn = category_record.category;
        
        IF new_category_id IS NULL THEN
            -- 判断是中文还是越南文，并插入到对应字段
            IF category_record.category ~ '[\u4e00-\u9fff]' THEN
                -- 包含中文字符，作为中文插入，越南文留空
                INSERT INTO knowledge_categories (name_vi, name_cn, sort_order)
                VALUES ('Khác', category_record.category, 1000)
                RETURNING id INTO new_category_id;
            ELSE
                -- 不包含中文字符，作为越南文插入
                INSERT INTO knowledge_categories (name_vi, name_cn, sort_order)
                VALUES (category_record.category, NULL, 1000)
                RETURNING id INTO new_category_id;
            END IF;
        END IF;
        
        -- 更新缩写表中的category_id
        UPDATE knowledge_abbreviations 
        SET category_id = new_category_id 
        WHERE category = category_record.category;
    END LOOP;
    
    -- 迁移话术库场景
    FOR scenario_record IN 
        SELECT DISTINCT scenario FROM knowledge_scripts WHERE scenario IS NOT NULL
    LOOP
        -- 检查场景是否已存在
        SELECT id INTO new_scenario_id 
        FROM knowledge_scenarios 
        WHERE name_vi = scenario_record.scenario OR name_cn = scenario_record.scenario;
        
        IF new_scenario_id IS NULL THEN
            -- 判断是中文还是越南文，并插入到对应字段
            IF scenario_record.scenario ~ '[\u4e00-\u9fff]' THEN
                -- 包含中文字符，作为中文插入，越南文留空
                INSERT INTO knowledge_scenarios (name_vi, name_cn, sort_order)
                VALUES ('Khác', scenario_record.scenario, 1000)
                RETURNING id INTO new_scenario_id;
            ELSE
                -- 不包含中文字符，作为越南文插入
                INSERT INTO knowledge_scenarios (name_vi, name_cn, sort_order)
                VALUES (scenario_record.scenario, NULL, 1000)
                RETURNING id INTO new_scenario_id;
            END IF;
        END IF;
        
        -- 更新话术表中的scenario_id
        UPDATE knowledge_scripts 
        SET scenario_id = new_scenario_id 
        WHERE scenario = scenario_record.scenario;
    END LOOP;
    
    RAISE NOTICE '数据迁移完成';
END
$$;

-- ===== 初始化默认数据 =====
-- 确保存在默认分类
INSERT INTO knowledge_categories (name_vi, name_cn, sort_order)
SELECT 'Khác', '其他', 999
WHERE NOT EXISTS (SELECT 1 FROM knowledge_categories WHERE name_vi = 'Khác');

INSERT INTO knowledge_scenarios (name_vi, name_cn, sort_order)
SELECT 'Khác', '其他', 999
WHERE NOT EXISTS (SELECT 1 FROM knowledge_scenarios WHERE name_vi = 'Khác');

-- ===== 更新向量化函数以支持新的分类结构 =====
-- 更新缩写向量化函数以使用分类表
CREATE OR REPLACE FUNCTION create_abbreviation_vectors_with_category_support(
  abbr_id UUID,
  abbreviation TEXT,
  full_form TEXT,
  description TEXT DEFAULT NULL,
  usage_context TEXT DEFAULT NULL,
  category_id UUID DEFAULT NULL,
  priority INTEGER DEFAULT 1,
  preserve_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
  category_name_vi TEXT;
  category_name_cn TEXT;
BEGIN
  -- 获取分类信息
  IF category_id IS NOT NULL THEN
    SELECT name_vi, name_cn INTO category_name_vi, category_name_cn 
    FROM knowledge_categories 
    WHERE id = category_id AND is_deleted = FALSE;
  END IF;

  base_metadata := jsonb_build_object(
    'abbreviation', abbreviation,
    'full_form', full_form,
    'category_id', COALESCE(category_id::text, ''),
    'category_vi', COALESCE(category_name_vi, ''),
    'category_cn', COALESCE(category_name_cn, ''),
    'priority', priority,
    'description', COALESCE(description, ''),
    'usage_context', COALESCE(usage_context, '')
  );

  -- 决定使用的created_at时间戳
  insert_created_at := COALESCE(preserve_created_at, NOW());

  -- 删除旧的向量记录
  DELETE FROM knowledge_vectors WHERE document_id = abbr_id AND document_type = 'abbreviation';

  -- 缩写识别向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'abbr_recognition',
    CONCAT('缩写词 ', abbreviation, ' 的识别'),
    base_metadata || jsonb_build_object('search_purpose', 'recognize_abbreviation'),
    2.0,
    insert_created_at,
    NOW()
  );

  -- 全称识别向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'full_recognition',
    CONCAT('全称 ', full_form, ' 可以缩写为 ', abbreviation),
    base_metadata || jsonb_build_object('search_purpose', 'suggest_abbreviation'),
    1.8,
    insert_created_at,
    NOW()
  );

  -- 语义理解向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'semantic',
    CONCAT(abbreviation, ' 表示 ', full_form, 
           CASE WHEN description IS NOT NULL AND description != '' 
                THEN CONCAT(' - ', description) ELSE '' END),
    base_metadata || jsonb_build_object('search_purpose', 'semantic_understanding'),
    1.5,
    insert_created_at,
    NOW()
  );

  -- 替换建议向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'replacement',
    CONCAT('将 ', full_form, ' 替换为 ', abbreviation),
    base_metadata || jsonb_build_object('search_purpose', 'replacement_suggestion'),
    1.2,
    insert_created_at,
    NOW()
  );

  -- 解释说明向量
  IF description IS NOT NULL AND description != '' THEN
    INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
    VALUES (
      abbr_id, 'abbreviation', 'explanation',
      CONCAT(abbreviation, ' (', full_form, ') 的解释：', description),
      base_metadata || jsonb_build_object('search_purpose', 'explanation'),
      1.0,
      insert_created_at,
      NOW()
    );
  END IF;
END;
$$;

-- 更新话术向量化函数以使用场景表
CREATE OR REPLACE FUNCTION create_script_vectors_with_scenario_support(
  script_id UUID,
  text TEXT,
  answer TEXT,
  scenario_id UUID DEFAULT NULL,
  priority INTEGER DEFAULT 1,
  preserve_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
  scenario_name_vi TEXT;
  scenario_name_cn TEXT;
BEGIN
  -- 获取场景信息
  IF scenario_id IS NOT NULL THEN
    SELECT name_vi, name_cn INTO scenario_name_vi, scenario_name_cn 
    FROM knowledge_scenarios 
    WHERE id = scenario_id AND is_deleted = FALSE;
  END IF;

  base_metadata := jsonb_build_object(
    'scenario_id', COALESCE(scenario_id::text, ''),
    'scenario_vi', COALESCE(scenario_name_vi, ''),
    'scenario_cn', COALESCE(scenario_name_cn, ''),
    'priority', priority,
    'text', text,
    'answer', answer
  );

  -- 决定使用的created_at时间戳
  insert_created_at := COALESCE(preserve_created_at, NOW());

  -- 删除旧的向量记录
  DELETE FROM knowledge_vectors WHERE document_id = script_id AND document_type = 'script';

  -- 场景识别向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'scenario',
    CONCAT('场景：', COALESCE(scenario_name_vi, COALESCE(scenario_name_cn, '')), ' - 用户对话：', text),
    base_metadata || jsonb_build_object('search_purpose', 'scenario_recognition'),
    2.0,
    insert_created_at,
    NOW()
  );

  -- 意图理解向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'intent',
    CONCAT('用户意图：', text),
    base_metadata || jsonb_build_object('search_purpose', 'intent_understanding'),
    1.8,
    insert_created_at,
    NOW()
  );

  -- 回答匹配向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'response',
    CONCAT('针对 "', text, '" 的回答：', answer),
    base_metadata || jsonb_build_object('search_purpose', 'response_matching'),
    1.5,
    insert_created_at,
    NOW()
  );

  -- 上下文理解向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'context',
    CONCAT('对话上下文：用户说"', text, '"，回答"', answer, '"'),
    base_metadata || jsonb_build_object('search_purpose', 'context_understanding'),
    1.2,
    insert_created_at,
    NOW()
  );

  -- 关键词匹配向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'keyword',
    CONCAT(text, ' ', answer),
    base_metadata || jsonb_build_object('search_purpose', 'keyword_matching'),
    1.0,
    insert_created_at,
    NOW()
  );
END;
$$;

-- ===== 更新自动向量化触发器 =====
-- 更新缩写自动向量化函数
CREATE OR REPLACE FUNCTION auto_vectorize_abbreviation_with_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 对于新增或更新的记录，创建向量
    PERFORM create_abbreviation_vectors_with_category_support(
        NEW.id,
        NEW.abbreviation,
        NEW.full_form,
        NEW.description,
        NEW.usage_context,
        NEW.category_id,
        NEW.priority,
        OLD.created_at  -- 更新时保留原始created_at
    );
    
    RETURN NEW;
END;
$$;

-- 更新话术自动向量化函数
CREATE OR REPLACE FUNCTION auto_vectorize_script_with_scenario()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- 对于新增或更新的记录，创建向量
    PERFORM create_script_vectors_with_scenario_support(
        NEW.id,
        NEW.text,
        NEW.answer,
        NEW.scenario_id,
        NEW.priority,
        OLD.created_at  -- 更新时保留原始created_at
    );
    
    RETURN NEW;
END;
$$;

-- 替换现有触发器
DROP TRIGGER IF EXISTS auto_vectorize_abbreviation_trigger ON knowledge_abbreviations;
CREATE TRIGGER auto_vectorize_abbreviation_trigger
    AFTER INSERT OR UPDATE ON knowledge_abbreviations
    FOR EACH ROW EXECUTE FUNCTION auto_vectorize_abbreviation_with_category();

DROP TRIGGER IF EXISTS auto_vectorize_script_trigger ON knowledge_scripts;
CREATE TRIGGER auto_vectorize_script_trigger
    AFTER INSERT OR UPDATE ON knowledge_scripts
    FOR EACH ROW EXECUTE FUNCTION auto_vectorize_script_with_scenario();

-- ===== 数据完整性检查 =====
-- 验证迁移结果
SELECT 'knowledge_categories' as table_name, 
       COUNT(*) as total_count, 
       COUNT(CASE WHEN name_vi IS NOT NULL THEN 1 END) as vi_count,
       COUNT(CASE WHEN name_cn IS NOT NULL THEN 1 END) as cn_count
FROM knowledge_categories
WHERE is_deleted = FALSE
UNION ALL
SELECT 'knowledge_scenarios' as table_name, 
       COUNT(*) as total_count, 
       COUNT(CASE WHEN name_vi IS NOT NULL THEN 1 END) as vi_count,
       COUNT(CASE WHEN name_cn IS NOT NULL THEN 1 END) as cn_count
FROM knowledge_scenarios
WHERE is_deleted = FALSE
UNION ALL
SELECT 'abbreviations_with_category_id' as table_name,
       COUNT(*) as total_count,
       COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category_id,
       COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as with_old_category
FROM knowledge_abbreviations
UNION ALL
SELECT 'scripts_with_scenario_id' as table_name,
       COUNT(*) as total_count,
       COUNT(CASE WHEN scenario_id IS NOT NULL THEN 1 END) as with_scenario_id,
       COUNT(CASE WHEN scenario IS NOT NULL THEN 1 END) as with_old_scenario
FROM knowledge_scripts
ORDER BY table_name; 