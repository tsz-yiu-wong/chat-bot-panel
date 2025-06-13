-- 知识库模块数据库结构
-- 包含缩写库、话术库和向量搜索功能

-- ===== 基础扩展 =====
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 核心表结构 =====
-- 创建缩写库表
CREATE TABLE IF NOT EXISTS knowledge_abbreviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(50) NOT NULL,
  full_form VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建话术库表
CREATE TABLE IF NOT EXISTS knowledge_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario VARCHAR(100) NOT NULL, -- 场景
  text TEXT NOT NULL, -- 用户对话
  answer TEXT NOT NULL, -- 回答的话术
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建知识库向量表
CREATE TABLE IF NOT EXISTS knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(20) NOT NULL, -- 'abbreviation' 或 'script'
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small 的向量维度
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 索引优化 =====
-- 创建向量搜索索引
CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_idx 
ON knowledge_vectors USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建文档ID和类型的复合索引
CREATE INDEX IF NOT EXISTS knowledge_vectors_document_idx 
ON knowledge_vectors (document_id, document_type);

-- 创建文档类型索引
CREATE INDEX IF NOT EXISTS knowledge_vectors_type_idx 
ON knowledge_vectors (document_type);

-- 创建缩写库索引
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_category_idx ON knowledge_abbreviations (category);
CREATE INDEX IF NOT EXISTS knowledge_abbreviations_abbreviation_idx ON knowledge_abbreviations (abbreviation);

-- 创建话术库索引
CREATE INDEX IF NOT EXISTS knowledge_scripts_scenario_idx ON knowledge_scripts (scenario);

-- ===== 函数定义 =====
-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为各表创建更新时间触发器
DROP TRIGGER IF EXISTS update_knowledge_abbreviations_updated_at ON knowledge_abbreviations;
CREATE TRIGGER update_knowledge_abbreviations_updated_at 
    BEFORE UPDATE ON knowledge_abbreviations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_scripts_updated_at ON knowledge_scripts;
CREATE TRIGGER update_knowledge_scripts_updated_at 
    BEFORE UPDATE ON knowledge_scripts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_vectors_updated_at ON knowledge_vectors;
CREATE TRIGGER update_knowledge_vectors_updated_at 
    BEFORE UPDATE ON knowledge_vectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建相似性搜索函数
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5,
  doc_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_type varchar(20),
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
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding) AS similarity
  FROM knowledge_vectors kv
  WHERE 
    (doc_type IS NULL OR kv.document_type = doc_type) AND
    1 - (kv.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kv.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 创建批量向量化现有文档的函数
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
    ka.id,
    ka.abbreviation as title,
    CONCAT(ka.abbreviation, ' - ', ka.full_form, ' - ', COALESCE(ka.description, '')) as content,
    ka.category,
    'knowledge_abbreviations' as table_name,
    'abbreviation' as document_type
  FROM knowledge_abbreviations ka
  LEFT JOIN knowledge_vectors kv ON ka.id = kv.document_id AND kv.document_type = 'abbreviation'
  WHERE kv.document_id IS NULL
  
  UNION ALL
  
  SELECT 
    ks.id,
    CONCAT('场景: ', ks.scenario) as title,
    CONCAT('用户: ', ks.text, ' | 回答: ', ks.answer) as content,
    ks.scenario as category,
    'knowledge_scripts' as table_name,
    'script' as document_type
  FROM knowledge_scripts ks
  LEFT JOIN knowledge_vectors kv ON ks.id = kv.document_id AND kv.document_type = 'script'
  WHERE kv.document_id IS NULL;
$$; 