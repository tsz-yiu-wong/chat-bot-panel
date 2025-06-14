-- 知识库模块数据库结构
-- 包含缩写库、话术库和向量搜索功能
-- 重新设计版本：修复列引用错误，优化结构

-- ===== 基础扩展 =====
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 清理现有结构 =====
-- 1. 删除特定于此模块的函数（如果存在）
DROP FUNCTION IF EXISTS auto_vectorize_abbreviation();
DROP FUNCTION IF EXISTS auto_vectorize_script();
DROP FUNCTION IF EXISTS create_abbreviation_vectors(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS create_script_vectors(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_abbreviations_by_embedding(vector(1536), TEXT, INTEGER, FLOAT);
DROP FUNCTION IF EXISTS search_scripts_by_embedding(vector(1536), TEXT, INTEGER, FLOAT);
DROP FUNCTION IF EXISTS get_replacement_suggestions_by_embedding(vector(1536), TEXT, INTEGER, FLOAT);
DROP FUNCTION IF EXISTS match_documents(vector(1536), int, float, text, text);
DROP FUNCTION IF EXISTS get_documents_without_vectors();
DROP FUNCTION IF EXISTS vectorize_existing_data();

-- 2. 删除表，CASCADE会处理依赖对象如索引和触发器（如果存在）
DROP TABLE IF EXISTS knowledge_vectors CASCADE;
DROP TABLE IF EXISTS knowledge_scripts CASCADE;
DROP TABLE IF EXISTS knowledge_abbreviations CASCADE;

-- ===== 核心表结构 =====
-- 创建缩写库表
CREATE TABLE knowledge_abbreviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(50) NOT NULL,
  full_form VARCHAR(200) NOT NULL,
  description TEXT,
  usage_context TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_priority CHECK (priority >= 1 AND priority <= 10)
);

-- 创建话术库表
CREATE TABLE knowledge_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_script_priority CHECK (priority >= 1 AND priority <= 10)
);

-- 创建知识库向量表
CREATE TABLE knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  vector_type VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}',
  search_weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_vector_type CHECK (
    (document_type = 'abbreviation' AND vector_type IN 
      ('abbr_recognition', 'full_recognition', 'semantic', 'replacement', 'explanation')
    ) OR
    (document_type = 'script' AND vector_type IN 
      ('scenario', 'intent', 'response', 'context', 'keyword')
    )
  )
);

-- ===== 索引创建 =====
-- 缩写库索引
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_category_idx ON knowledge_abbreviations (category);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_abbreviation_idx ON knowledge_abbreviations (abbreviation);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_full_form_idx ON knowledge_abbreviations (full_form);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_priority_idx ON knowledge_abbreviations (priority DESC, is_active);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_active_idx ON knowledge_abbreviations (is_active) WHERE is_active = TRUE;

-- 话术库索引
CREATE INDEX IF NOT EXISTS knowledge_scripts_scenario_idx ON knowledge_scripts (scenario);
CREATE INDEX IF NOT EXISTS knowledge_scripts_priority_idx ON knowledge_scripts (priority DESC, is_active);
CREATE INDEX IF NOT EXISTS knowledge_scripts_active_idx ON knowledge_scripts (is_active) WHERE is_active = TRUE;

-- 向量表索引
CREATE INDEX IF NOT EXISTS knowledge_vectors_document_idx ON knowledge_vectors (document_id, document_type);
CREATE INDEX IF NOT EXISTS knowledge_vectors_type_idx ON knowledge_vectors (document_type, vector_type);
CREATE INDEX IF NOT EXISTS knowledge_vectors_weight_idx ON knowledge_vectors (search_weight DESC);

-- 向量搜索索引（分类型创建）
CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_abbr_idx 
ON knowledge_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE document_type = 'abbreviation';

CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_script_idx 
ON knowledge_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE document_type = 'script';

-- ===== 基础触发器创建 =====
-- 为各表创建更新时间触发器
-- 注意：此处假设 update_updated_at_column() 函数已存在（由通用脚本创建）
CREATE TRIGGER update_knowledge_abbreviations_updated_at 
    BEFORE UPDATE ON knowledge_abbreviations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_scripts_updated_at 
    BEFORE UPDATE ON knowledge_scripts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_vectors_updated_at 
    BEFORE UPDATE ON knowledge_vectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 向量化函数 =====
-- 创建缩写向量化函数（原版本 - 向后兼容）
CREATE OR REPLACE FUNCTION create_abbreviation_vectors(
  abbr_id UUID,
  abbreviation TEXT,
  full_form TEXT,
  description TEXT DEFAULT NULL,
  usage_context TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  priority INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 调用带时间戳版本的函数，不保留时间戳（使用当前时间）
  PERFORM create_abbreviation_vectors_with_timestamp(
    abbr_id, abbreviation, full_form, description, usage_context, category, priority, NULL
  );
END;
$$;

-- 创建缩写向量化函数（带时间戳版本 - 用于更新时保留原始created_at）
CREATE OR REPLACE FUNCTION create_abbreviation_vectors_with_timestamp(
  abbr_id UUID,
  abbreviation TEXT,
  full_form TEXT,
  description TEXT DEFAULT NULL,
  usage_context TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  priority INTEGER DEFAULT 1,
  preserve_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
BEGIN
  base_metadata := jsonb_build_object(
    'abbreviation', abbreviation,
    'full_form', full_form,
    'category', COALESCE(category, ''),
    'priority', priority,
    'description', COALESCE(description, ''),
    'usage_context', COALESCE(usage_context, '')
  );

  -- 决定使用的created_at时间戳
  insert_created_at := COALESCE(preserve_created_at, NOW());

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
    CONCAT(
      abbreviation, ' 表示 ', full_form,
      CASE WHEN description IS NOT NULL THEN CONCAT('，', description) ELSE '' END,
      CASE WHEN usage_context IS NOT NULL THEN CONCAT('，常用于', usage_context) ELSE '' END
    ),
    base_metadata || jsonb_build_object('search_purpose', 'semantic_understanding'),
    1.5,
    insert_created_at,
    NOW()
  );

  -- 替换建议向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'replacement',
    CONCAT('将 "', full_form, '" 替换为 "', abbreviation, '"'),
    base_metadata || jsonb_build_object(
      'search_purpose', 'replacement_suggestion',
      'replacement_pattern', jsonb_build_object('from', full_form, 'to', abbreviation, 'type', 'full_to_abbr')
    ),
    priority::float,
    insert_created_at,
    NOW()
  );

  -- 解释向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    abbr_id, 'abbreviation', 'explanation',
    CONCAT(abbreviation, ' 的全称是 ', full_form),
    base_metadata || jsonb_build_object(
      'search_purpose', 'explain_abbreviation',
      'replacement_pattern', jsonb_build_object('from', abbreviation, 'to', full_form, 'type', 'abbr_to_full')
    ),
    1.2,
    insert_created_at,
    NOW()
  );
END;
$$;

-- 创建话术向量化函数（原版本 - 向后兼容）
CREATE OR REPLACE FUNCTION create_script_vectors(
  script_id UUID,
  scenario TEXT,
  text TEXT,
  answer TEXT,
  priority INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 调用带时间戳版本的函数，不保留时间戳（使用当前时间）
  PERFORM create_script_vectors_with_timestamp(
    script_id, scenario, text, answer, priority, NULL
  );
END;
$$;

-- 创建话术向量化函数（带时间戳版本 - 用于更新时保留原始created_at）
CREATE OR REPLACE FUNCTION create_script_vectors_with_timestamp(
  script_id UUID,
  scenario TEXT,
  text TEXT,
  answer TEXT,
  priority INTEGER DEFAULT 1,
  preserve_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
BEGIN
  base_metadata := jsonb_build_object(
    'scenario', scenario,
    'text', text,
    'answer', answer,
    'priority', priority
  );

  -- 决定使用的created_at时间戳
  insert_created_at := COALESCE(preserve_created_at, NOW());

  -- 场景匹配向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'scenario',
    CONCAT('场景: ', scenario),
    base_metadata || jsonb_build_object('search_purpose', 'match_scenario'),
    2.0,
    insert_created_at,
    NOW()
  );

  -- 意图理解向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'intent',
    text,
    base_metadata || jsonb_build_object('search_purpose', 'understand_intent'),
    1.8,
    insert_created_at,
    NOW()
  );

  -- 回答内容向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'response',
    answer,
    base_metadata || jsonb_build_object('search_purpose', 'find_response'),
    1.5,
    insert_created_at,
    NOW()
  );

  -- 上下文向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'context',
    CONCAT(text, ' | ', answer),
    base_metadata || jsonb_build_object('search_purpose', 'context_understanding'),
    1.3,
    insert_created_at,
    NOW()
  );

  -- 关键词向量
  INSERT INTO knowledge_vectors (document_id, document_type, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    script_id, 'script', 'keyword',
    CONCAT(scenario, ' ', regexp_replace(text, '[^\w\s]', ' ', 'g')),
    base_metadata || jsonb_build_object('search_purpose', 'keyword_extraction'),
    1.2,
    insert_created_at,
    NOW()
  );
END;
$$;

-- ===== 自动向量化触发器 =====
-- 缩写库自动向量化（修复版本 - 保留原始created_at）
CREATE OR REPLACE FUNCTION auto_vectorize_abbreviation()
RETURNS TRIGGER AS $$
DECLARE
  original_created_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 在删除前，先获取最早的 created_at 时间戳
    SELECT MIN(created_at) INTO original_created_at
    FROM knowledge_vectors 
    WHERE document_id = OLD.id AND document_type = 'abbreviation';
    
    -- 删除旧的向量记录
    DELETE FROM knowledge_vectors 
    WHERE document_id = OLD.id AND document_type = 'abbreviation';
  END IF;

  IF NEW.is_active THEN
    -- 创建新的向量记录，如果是UPDATE操作则保留原始created_at
    PERFORM create_abbreviation_vectors_with_timestamp(
      NEW.id, NEW.abbreviation, NEW.full_form, 
      NEW.description, NEW.usage_context, NEW.category, NEW.priority,
      CASE WHEN TG_OP = 'UPDATE' THEN original_created_at ELSE NULL END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 话术库自动向量化（修复版本 - 保留原始created_at）
CREATE OR REPLACE FUNCTION auto_vectorize_script()
RETURNS TRIGGER AS $$
DECLARE
  original_created_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 在删除前，先获取最早的 created_at 时间戳
    SELECT MIN(created_at) INTO original_created_at
    FROM knowledge_vectors 
    WHERE document_id = OLD.id AND document_type = 'script';
    
    -- 删除旧的向量记录
    DELETE FROM knowledge_vectors 
    WHERE document_id = OLD.id AND document_type = 'script';
  END IF;

  IF NEW.is_active THEN
    -- 创建新的向量记录，如果是UPDATE操作则保留原始created_at
    PERFORM create_script_vectors_with_timestamp(
      NEW.id, NEW.scenario, NEW.text, NEW.answer, NEW.priority,
      CASE WHEN TG_OP = 'UPDATE' THEN original_created_at ELSE NULL END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 创建触发器
CREATE TRIGGER auto_vectorize_abbreviation_trigger
  AFTER INSERT OR UPDATE ON knowledge_abbreviations
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_abbreviation();

CREATE TRIGGER auto_vectorize_script_trigger
  AFTER INSERT OR UPDATE ON knowledge_scripts
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_script();

-- ===== 搜索函数 =====
-- 通用文档匹配函数
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5,
  doc_type text DEFAULT NULL,
  vector_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_type varchar(20),
  vector_type varchar(30),
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    kv.id,
    kv.document_id,
    kv.document_type,
    kv.vector_type,
    kv.content,
    kv.metadata,
    (1 - (kv.embedding <=> query_embedding)) * kv.search_weight AS weighted_similarity
  FROM knowledge_vectors kv
  WHERE 
    (doc_type IS NULL OR kv.document_type = doc_type) AND
    (vector_type_filter IS NULL OR kv.vector_type = vector_type_filter) AND
    (1 - (kv.embedding <=> query_embedding)) * kv.search_weight > similarity_threshold
  ORDER BY weighted_similarity DESC
  LIMIT match_count;
$$;

-- 智能缩写搜索函数（需要实现get_embedding函数）
CREATE OR REPLACE FUNCTION search_abbreviations_by_embedding(
  query_embedding vector(1536),
  search_purpose TEXT DEFAULT 'semantic_understanding',
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  abbreviation TEXT,
  full_form TEXT,
  category TEXT,
  description TEXT,
  usage_context TEXT,
  priority INTEGER,
  similarity FLOAT,
  search_purpose TEXT,
  replacement_suggestion JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ka.id,
    ka.abbreviation,
    ka.full_form,
    ka.category,
    ka.description,
    ka.usage_context,
    ka.priority,
    (1 - (kv.embedding <=> query_embedding)) * kv.search_weight AS weighted_similarity,
    (kv.metadata->>'search_purpose')::TEXT,
    CASE 
      WHEN kv.metadata ? 'replacement_pattern' 
      THEN kv.metadata->'replacement_pattern'
      ELSE NULL 
    END as replacement_suggestion
  FROM knowledge_vectors kv
  JOIN knowledge_abbreviations ka ON kv.document_id = ka.id
  WHERE 
    kv.document_type = 'abbreviation'
    AND ka.is_active = TRUE
    AND (search_purpose = 'all' OR kv.metadata->>'search_purpose' = search_purpose)
    AND (1 - (kv.embedding <=> query_embedding)) * kv.search_weight > similarity_threshold
  ORDER BY weighted_similarity DESC, ka.priority DESC
  LIMIT match_count;
$$;

-- 智能话术搜索函数
CREATE OR REPLACE FUNCTION search_scripts_by_embedding(
  query_embedding vector(1536),
  search_purpose TEXT DEFAULT 'scenario',
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  scenario TEXT,
  text TEXT,
  answer TEXT,
  priority INTEGER,
  similarity FLOAT,
  search_purpose TEXT,
  context_info JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ks.id,
    ks.scenario,
    ks.text,
    ks.answer,
    ks.priority,
    (1 - (kv.embedding <=> query_embedding)) * kv.search_weight AS weighted_similarity,
    (kv.metadata->>'search_purpose')::TEXT,
    kv.metadata as context_info
  FROM knowledge_vectors kv
  JOIN knowledge_scripts ks ON kv.document_id = ks.id
  WHERE 
    kv.document_type = 'script'
    AND ks.is_active = TRUE
    AND kv.vector_type = search_purpose
    AND (1 - (kv.embedding <=> query_embedding)) * kv.search_weight > similarity_threshold
  ORDER BY weighted_similarity DESC, ks.priority DESC
  LIMIT match_count;
$$;

-- 获取替换建议函数
CREATE OR REPLACE FUNCTION get_replacement_suggestions_by_embedding(
  query_embedding vector(1536),
  suggestion_type TEXT DEFAULT 'full_to_abbr',
  max_suggestions INTEGER DEFAULT 10,
  min_confidence FLOAT DEFAULT 0.8
)
RETURNS TABLE (
  abbreviation TEXT,
  full_form TEXT,
  confidence FLOAT,
  replacement_from TEXT,
  replacement_to TEXT,
  priority INTEGER,
  context_relevance TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ka.abbreviation,
    ka.full_form,
    1 - (kv.embedding <=> query_embedding) AS confidence,
    (kv.metadata->'replacement_pattern'->>'from')::TEXT as replacement_from,
    (kv.metadata->'replacement_pattern'->>'to')::TEXT as replacement_to,
    ka.priority,
    COALESCE(ka.usage_context, '通用') as context_relevance
  FROM knowledge_vectors kv
  JOIN knowledge_abbreviations ka ON kv.document_id = ka.id
  WHERE 
    kv.document_type = 'abbreviation'
    AND ka.is_active = TRUE
    AND kv.vector_type IN ('replacement', 'explanation')
    AND kv.metadata->'replacement_pattern'->>'type' = suggestion_type
    AND 1 - (kv.embedding <=> query_embedding) >= min_confidence
  ORDER BY confidence DESC, ka.priority DESC, ka.created_at DESC
  LIMIT max_suggestions;
$$;

-- ===== 数据初始化函数 =====
-- 批量向量化现有数据
CREATE OR REPLACE FUNCTION vectorize_existing_data()
RETURNS TABLE (
  processed_abbreviations INTEGER,
  processed_scripts INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  abbr_count INTEGER := 0;
  script_count INTEGER := 0;
  abbr_record RECORD;
  script_record RECORD;
BEGIN
  -- 处理缩写数据
  FOR abbr_record IN 
    SELECT id, abbreviation, full_form, description, usage_context, category, priority
    FROM knowledge_abbreviations 
    WHERE is_active = TRUE
  LOOP
    PERFORM create_abbreviation_vectors(
      abbr_record.id, abbr_record.abbreviation, abbr_record.full_form,
      abbr_record.description, abbr_record.usage_context, 
      abbr_record.category, abbr_record.priority
    );
    abbr_count := abbr_count + 1;
  END LOOP;

  -- 处理话术数据
  FOR script_record IN 
    SELECT id, scenario, text, answer, priority
    FROM knowledge_scripts 
    WHERE is_active = TRUE
  LOOP
    PERFORM create_script_vectors(
      script_record.id, script_record.scenario, 
      script_record.text, script_record.answer, script_record.priority
    );
    script_count := script_count + 1;
  END LOOP;

  RETURN QUERY SELECT abbr_count, script_count;
END;
$$;

-- 获取未向量化的文档
CREATE OR REPLACE FUNCTION get_documents_without_vectors()
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  table_name text,
  document_type text
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ks.id,
    CONCAT('场景: ', ks.scenario) as title,
    CONCAT('用户: ', ks.text, ' | 回答: ', ks.answer) as content,
    ks.scenario as category,
    'knowledge_scripts' as table_name,
    'script' as document_type
  FROM knowledge_scripts ks
  LEFT JOIN knowledge_vectors kv ON ks.id = kv.document_id AND kv.document_type = 'script'
  WHERE kv.document_id IS NULL AND ks.is_active = TRUE
  
  UNION ALL
  
  SELECT 
    ka.id,
    CONCAT('缩写: ', ka.abbreviation) as title,
    CONCAT(ka.abbreviation, ' = ', ka.full_form, 
           CASE WHEN ka.description IS NOT NULL THEN CONCAT(' (', ka.description, ')') ELSE '' END) as content,
    ka.category as category,
    'knowledge_abbreviations' as table_name,
    'abbreviation' as document_type
  FROM knowledge_abbreviations ka
  LEFT JOIN knowledge_vectors kv ON ka.id = kv.document_id AND kv.document_type = 'abbreviation'
  WHERE kv.document_id IS NULL AND ka.is_active = TRUE;
$$;

-- ===== 示例数据插入 =====
-- 插入一些示例数据用于测试
INSERT INTO knowledge_abbreviations (category, abbreviation, full_form, description, usage_context, priority) VALUES
('技术', 'AI', '人工智能', '人工智能技术', '技术讨论', 9),
('技术', 'ML', '机器学习', '机器学习算法', '技术讨论', 8),
('商务', 'ROI', '投资回报率', '投资回报率分析', '商务分析', 7),
('日常', 'FAQ', '常见问题', '常见问题解答', '客服场景', 6);

INSERT INTO knowledge_scripts (scenario, text, answer, priority) VALUES
('技术咨询', '什么是人工智能？', 'AI（人工智能）是一种模拟人类智能的技术，能够学习、推理和解决问题。', 9),
('商务咨询', 'ROI怎么计算？', 'ROI（投资回报率）= (投资收益 - 投资成本) / 投资成本 × 100%', 8),
('产品介绍', '你们的产品有什么特色？', '我们的产品采用先进的AI技术，能够提供智能化的解决方案。', 7);

-- 注释：由于触发器会自动生成向量，上面的INSERT语句执行后会自动创建相应的向量数据
-- 如果需要为现有数据批量生成向量，可以运行：
-- SELECT * FROM vectorize_existing_data(); 