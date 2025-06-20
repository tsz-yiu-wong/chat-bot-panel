-- 机器人人设向量化数据库Schema
-- 独立的人设向量管理系统

-- ===== 基础扩展 =====
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 机器人向量表 =====
CREATE TABLE bot_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bot_personalities(id) ON DELETE CASCADE,
  vector_type VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}',
  search_weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT valid_bot_vector_type CHECK (
    vector_type IN ('basic_info', 'personality', 'experiences', 'preferences', 'comprehensive', 'dreams')
  )
);

-- ===== 索引 =====
CREATE INDEX bot_vectors_bot_id_idx ON bot_vectors(bot_id);
CREATE INDEX bot_vectors_type_idx ON bot_vectors(vector_type);
CREATE INDEX bot_vectors_weight_idx ON bot_vectors(search_weight DESC);
CREATE INDEX bot_vectors_active_idx ON bot_vectors(is_deleted) WHERE is_deleted = FALSE;

-- 向量搜索索引
CREATE INDEX bot_vectors_embedding_idx 
ON bot_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
WHERE is_deleted = FALSE;

-- ===== 向量化函数 =====
CREATE OR REPLACE FUNCTION create_bot_personality_vectors(
  p_bot_id UUID,
  p_bot_name TEXT DEFAULT '',
  p_nationality TEXT DEFAULT '',
  p_age INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT '',
  p_current_job TEXT DEFAULT '',
  p_values TEXT DEFAULT '',
  p_life_philosophy TEXT DEFAULT '',
  p_worldview TEXT DEFAULT '',
  p_hobbies TEXT DEFAULT '',
  p_childhood_experience TEXT DEFAULT '',
  p_work_experience TEXT DEFAULT '',
  p_relationship_experience TEXT DEFAULT '',
  p_business_experience TEXT DEFAULT '',
  p_investment_experience TEXT DEFAULT '',
  p_favorite_music TEXT DEFAULT '',
  p_favorite_movies TEXT DEFAULT '',
  p_favorite_food TEXT DEFAULT '',
  p_favorite_fashion TEXT DEFAULT '',
  p_life_dreams TEXT DEFAULT '',
  p_future_thoughts TEXT DEFAULT '',
  p_places_to_visit TEXT DEFAULT '',
  preserve_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
BEGIN
  -- 基础元数据
  base_metadata := jsonb_build_object(
    'bot_name', COALESCE(p_bot_name, ''),
    'nationality', COALESCE(p_nationality, ''),
    'age', COALESCE(p_age, 0),
    'gender', COALESCE(p_gender, ''),
    'current_job', COALESCE(p_current_job, '')
  );

  -- 决定使用的created_at时间戳
  insert_created_at := COALESCE(preserve_created_at, NOW());

  -- 删除旧的向量记录
  DELETE FROM bot_vectors WHERE bot_id = p_bot_id;

  -- 1. 基础信息向量
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'basic_info',
    CONCAT(
      '姓名：', COALESCE(p_bot_name, ''), 
      ' 年龄：', COALESCE(p_age::text, ''), 
      ' 性别：', COALESCE(p_gender, ''),
      ' 国籍：', COALESCE(p_nationality, ''),
      ' 职业：', COALESCE(p_current_job, '')
    ),
    base_metadata || jsonb_build_object('search_purpose', 'basic_identity'),
    2.0,
    insert_created_at,
    NOW()
  );

  -- 2. 性格特征向量
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'personality',
    CONCAT(
      '价值观：', COALESCE(p_values, ''),
      ' 人生哲学：', COALESCE(p_life_philosophy, ''),
      ' 世界观：', COALESCE(p_worldview, ''),
      ' 兴趣爱好：', COALESCE(p_hobbies, '')
    ),
    base_metadata || jsonb_build_object('search_purpose', 'personality_traits'),
    1.8,
    insert_created_at,
    NOW()
  );

  -- 3. 人生经历向量
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'experiences',
    CONCAT(
      '童年经历：', COALESCE(p_childhood_experience, ''),
      ' 工作经历：', COALESCE(p_work_experience, ''),
      ' 感情经历：', COALESCE(p_relationship_experience, ''),
      ' 商业经历：', COALESCE(p_business_experience, ''),
      ' 投资经历：', COALESCE(p_investment_experience, '')
    ),
    base_metadata || jsonb_build_object('search_purpose', 'life_experiences'),
    1.6,
    insert_created_at,
    NOW()
  );

  -- 4. 生活偏好向量
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'preferences',
    CONCAT(
      '喜欢的音乐：', COALESCE(p_favorite_music, ''),
      ' 喜欢的电影：', COALESCE(p_favorite_movies, ''),
      ' 喜欢的美食：', COALESCE(p_favorite_food, ''),
      ' 喜欢的时尚：', COALESCE(p_favorite_fashion, '')
    ),
    base_metadata || jsonb_build_object('search_purpose', 'lifestyle_preferences'),
    1.4,
    insert_created_at,
    NOW()
  );

  -- 5. 综合向量（包含所有信息）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'comprehensive',
    CONCAT(
      '机器人：', COALESCE(p_bot_name, ''),
      ' 基本信息：年龄', COALESCE(p_age::text, ''), '岁，', COALESCE(p_gender, ''), '，', COALESCE(p_nationality, ''), '人，职业是', COALESCE(p_current_job, ''),
      ' 性格特征：', COALESCE(p_values, ''), ' ', COALESCE(p_life_philosophy, ''), ' ', COALESCE(p_worldview, ''),
      ' 兴趣爱好：', COALESCE(p_hobbies, ''),
      ' 人生经历：', COALESCE(p_childhood_experience, ''), ' ', COALESCE(p_work_experience, ''),
      ' 生活偏好：喜欢', COALESCE(p_favorite_music, ''), '音乐，', COALESCE(p_favorite_movies, ''), '电影，', COALESCE(p_favorite_food, ''), '美食',
      ' 未来梦想：', COALESCE(p_life_dreams, ''), ' ', COALESCE(p_future_thoughts, ''), ' ', COALESCE(p_places_to_visit, '')
    ),
    base_metadata || jsonb_build_object('search_purpose', 'comprehensive_profile'),
    2.2,
    insert_created_at,
    NOW()
  );
END;
$$;

-- ===== 自动向量化触发器 =====
CREATE OR REPLACE FUNCTION auto_vectorize_bot_personality()
RETURNS TRIGGER AS $$
DECLARE
  original_created_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 在删除前，先获取最早的 created_at 时间戳
    SELECT MIN(created_at) INTO original_created_at
    FROM bot_vectors 
    WHERE bot_id = OLD.id;
    
    -- 删除旧的向量记录
    DELETE FROM bot_vectors WHERE bot_id = OLD.id;
  END IF;

  IF NOT NEW.is_deleted THEN
    -- 创建新的向量记录，如果是UPDATE操作则保留原始created_at
    PERFORM create_bot_personality_vectors(
      NEW.id,
      NEW.bot_name,
      NEW.nationality,
      NEW.age,
      NEW.gender,
      NEW.current_job,
      NEW.values,
      NEW.life_philosophy,
      NEW.worldview,
      NEW.hobbies,
      NEW.childhood_experience,
      NEW.work_experience,
      NEW.relationship_experience,
      NEW.business_experience,
      NEW.investment_experience,
      NEW.favorite_music,
      NEW.favorite_movies,
      NEW.favorite_food,
      NEW.favorite_fashion,
      NEW.life_dreams,
      NEW.future_thoughts,
      NEW.places_to_visit,
      CASE WHEN TG_OP = 'UPDATE' THEN original_created_at ELSE NULL END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 创建触发器
CREATE TRIGGER auto_vectorize_bot_personality_trigger
  AFTER INSERT OR UPDATE ON bot_personalities
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_bot_personality();

-- ===== 搜索函数 =====
-- 基于向量搜索相似人设
CREATE OR REPLACE FUNCTION search_similar_bot_personalities(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7,
  vector_type_filter TEXT DEFAULT NULL,
  exclude_bot_id UUID DEFAULT NULL
)
RETURNS TABLE (
  bot_id UUID,
  bot_name TEXT,
  vector_type TEXT,
  content TEXT,
  similarity FLOAT,
  search_weight FLOAT,
  metadata JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    bv.bot_id,
    (bv.metadata->>'bot_name')::TEXT as bot_name,
    bv.vector_type,
    bv.content,
    (1 - (bv.embedding <=> query_embedding)) * bv.search_weight AS weighted_similarity,
    bv.search_weight,
    bv.metadata
  FROM bot_vectors bv
  WHERE 
    bv.is_deleted = FALSE
    AND (vector_type_filter IS NULL OR bv.vector_type = vector_type_filter)
    AND (exclude_bot_id IS NULL OR bv.bot_id != exclude_bot_id)
    AND (1 - (bv.embedding <=> query_embedding)) * bv.search_weight > similarity_threshold
  ORDER BY weighted_similarity DESC
  LIMIT match_count;
$$;

-- 获取机器人的所有向量
CREATE OR REPLACE FUNCTION get_bot_personality_vectors(p_bot_id UUID)
RETURNS TABLE (
  id UUID,
  vector_type TEXT,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  search_weight FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id,
    vector_type,
    content,
    embedding,
    metadata,
    search_weight,
    created_at
  FROM bot_vectors
  WHERE bot_id = p_bot_id AND is_deleted = FALSE
  ORDER BY search_weight DESC, created_at ASC;
$$;

-- ===== 数据初始化函数 =====
-- 批量向量化现有机器人人设
CREATE OR REPLACE FUNCTION vectorize_existing_bot_personalities()
RETURNS TABLE (
  processed_count INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  processed INTEGER := 0;
  total INTEGER := 0;
  bot_record RECORD;
BEGIN
  -- 统计总数
  SELECT COUNT(*) INTO total FROM bot_personalities WHERE is_deleted = FALSE;
  
  -- 处理每个机器人人设
  FOR bot_record IN 
    SELECT * FROM bot_personalities WHERE is_deleted = FALSE
  LOOP
    -- 调用向量化函数
    PERFORM create_bot_personality_vectors(
      bot_record.id,
      bot_record.bot_name,
      bot_record.nationality,
      bot_record.age,
      bot_record.gender,
      bot_record.current_job,
      bot_record.values,
      bot_record.life_philosophy,
      bot_record.worldview,
      bot_record.hobbies,
      bot_record.childhood_experience,
      bot_record.work_experience,
      bot_record.relationship_experience,
      bot_record.business_experience,
      bot_record.investment_experience,
      bot_record.favorite_music,
      bot_record.favorite_movies,
      bot_record.favorite_food,
      bot_record.favorite_fashion,
      bot_record.life_dreams,
      bot_record.future_thoughts,
      bot_record.places_to_visit,
      bot_record.created_at
    );
    
    processed := processed + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed, total;
END;
$$;

-- ===== 更新时间触发器 =====
CREATE TRIGGER update_bot_vectors_updated_at 
    BEFORE UPDATE ON bot_vectors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 支持多语言的向量化函数 =====
CREATE OR REPLACE FUNCTION create_bot_personality_vectors_with_language(
  p_bot_id UUID,
  p_bot_name TEXT DEFAULT '',
  p_nationality TEXT DEFAULT '',
  p_age INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT '',
  p_height TEXT DEFAULT '',
  p_weight TEXT DEFAULT '',
  p_blood_type TEXT DEFAULT '',
  p_zodiac_sign TEXT DEFAULT '',
  p_birth_date TEXT DEFAULT '',
  p_birth_place TEXT DEFAULT '',
  p_education_level TEXT DEFAULT '',
  p_graduate_school TEXT DEFAULT '',
  p_major TEXT DEFAULT '',
  p_current_address TEXT DEFAULT '',
  p_current_job TEXT DEFAULT '',
  p_work_address TEXT DEFAULT '',
  p_favorite_music TEXT DEFAULT '',
  p_favorite_movies TEXT DEFAULT '',
  p_favorite_fashion TEXT DEFAULT '',
  p_favorite_hairstyle TEXT DEFAULT '',
  p_favorite_food TEXT DEFAULT '',
  p_favorite_restaurants TEXT DEFAULT '',
  p_hobbies TEXT DEFAULT '',
  p_worldview TEXT DEFAULT '',
  p_life_philosophy TEXT DEFAULT '',
  p_values TEXT DEFAULT '',
  p_childhood_experience TEXT DEFAULT '',
  p_childhood_stories TEXT DEFAULT '',
  p_growth_experience TEXT DEFAULT '',
  p_relationship_experience TEXT DEFAULT '',
  p_marital_status TEXT DEFAULT '',
  p_marriage_history TEXT DEFAULT '',
  p_work_experience TEXT DEFAULT '',
  p_business_experience TEXT DEFAULT '',
  p_investment_experience TEXT DEFAULT '',
  p_places_to_visit TEXT DEFAULT '',
  p_life_dreams TEXT DEFAULT '',
  p_future_thoughts TEXT DEFAULT '',
  p_language TEXT DEFAULT 'zh'
)
RETURNS void
LANGUAGE 'plpgsql'
AS $$
DECLARE
  base_metadata JSONB;
  insert_created_at TIMESTAMPTZ;
  original_created_at TIMESTAMPTZ;
  
  -- 标签变量（根据语言选择）
  label_name TEXT;
  label_age TEXT;
  label_gender TEXT;
  label_nationality TEXT;
  label_job TEXT;
  label_height TEXT;
  label_weight TEXT;
  label_blood_type TEXT;
  label_zodiac TEXT;
  label_birth_date TEXT;
  label_birth_place TEXT;
  label_education_level TEXT;
  label_graduate_school TEXT;
  label_major TEXT;
  label_current_address TEXT;
  label_work_address TEXT;
  label_music TEXT;
  label_movies TEXT;
  label_fashion TEXT;
  label_hairstyle TEXT;
  label_food TEXT;
  label_restaurants TEXT;
  label_hobbies TEXT;
  label_worldview TEXT;
  label_life_philosophy TEXT;
  label_values TEXT;
  label_childhood_exp TEXT;
  label_childhood_stories TEXT;
  label_growth_exp TEXT;
  label_relationship_exp TEXT;
  label_marital_status TEXT;
  label_marriage_history TEXT;
  label_work_exp TEXT;
  label_business_exp TEXT;
  label_investment_exp TEXT;
  label_places_to_visit TEXT;
  label_life_dreams TEXT;
  label_future_thoughts TEXT;
BEGIN
  -- 设置标签（根据语言）
  IF p_language = 'vi' THEN
    -- 越南文标签
    label_name := 'Họ tên';
    label_age := 'Tuổi';
    label_gender := 'Giới tính';
    label_nationality := 'Quốc tịch';
    label_job := 'Công việc hiện tại';
    label_height := 'Chiều cao';
    label_weight := 'Cân nặng';
    label_blood_type := 'Nhóm máu';
    label_zodiac := 'Cung hoàng đạo';
    label_birth_date := 'Ngày sinh';
    label_birth_place := 'Nơi sinh';
    label_education_level := 'Trình độ học vấn';
    label_graduate_school := 'Trường tốt nghiệp';
    label_major := 'Chuyên ngành';
    label_current_address := 'Địa chỉ hiện tại';
    label_work_address := 'Địa chỉ làm việc';
    label_music := 'Âm nhạc yêu thích';
    label_movies := 'Phim ảnh yêu thích';
    label_fashion := 'Phong cách ăn mặc yêu thích';
    label_hairstyle := 'Kiểu tóc yêu thích';
    label_food := 'Ẩm thực yêu thích';
    label_restaurants := 'Nhà hàng yêu thích';
    label_hobbies := 'Sở thích cá nhân';
    label_worldview := 'Thế giới quan';
    label_life_philosophy := 'Nhân sinh quan';
    label_values := 'Giá trị quan';
    label_childhood_exp := 'Trải nghiệm thời thơ ấu';
    label_childhood_stories := 'Câu chuyện thời thơ ấu';
    label_growth_exp := 'Quá trình trưởng thành';
    label_relationship_exp := 'Kinh nghiệm tình cảm';
    label_marital_status := 'Tình trạng hôn nhân';
    label_marriage_history := 'Kinh nghiệm hôn nhân';
    label_work_exp := 'Kinh nghiệm làm việc';
    label_business_exp := 'Kinh nghiệm khởi nghiệp';
    label_investment_exp := 'Kinh nghiệm đầu tư';
    label_places_to_visit := 'Những nơi muốn đến';
    label_life_dreams := 'Ước mơ cuộc đời';
    label_future_thoughts := 'Suy nghĩ về cuộc sống tương lai';
  ELSE
    -- 中文标签（默认）
    label_name := '姓名';
    label_age := '年龄';
    label_gender := '性别';
    label_nationality := '国籍';
    label_job := '现在的工作';
    label_height := '身高';
    label_weight := '体重';
    label_blood_type := '血型';
    label_zodiac := '星座';
    label_birth_date := '出生日期';
    label_birth_place := '出生地';
    label_education_level := '学历';
    label_graduate_school := '毕业院校';
    label_major := '专业';
    label_current_address := '现居地址';
    label_work_address := '工作地址';
    label_music := '喜欢的音乐';
    label_movies := '喜欢的电影';
    label_fashion := '喜欢的穿着';
    label_hairstyle := '喜欢的发型';
    label_food := '喜欢的美食';
    label_restaurants := '喜欢的餐厅';
    label_hobbies := '兴趣爱好';
    label_worldview := '世界观';
    label_life_philosophy := '人生观';
    label_values := '价值观';
    label_childhood_exp := '童年经历';
    label_childhood_stories := '童年故事';
    label_growth_exp := '成长经历';
    label_relationship_exp := '感情经历';
    label_marital_status := '婚姻状况';
    label_marriage_history := '婚姻经历';
    label_work_exp := '工作经历';
    label_business_exp := '创业经历';
    label_investment_exp := '投资经历';
    label_places_to_visit := '想去的地方';
    label_life_dreams := '人生梦想';
    label_future_thoughts := '对未来人生的想法';
  END IF;

  -- 保存最早的created_at时间戳（如果已存在向量）
  SELECT MIN(created_at) INTO original_created_at
  FROM bot_vectors 
  WHERE bot_id = p_bot_id;
  
  insert_created_at := COALESCE(original_created_at, NOW());

  -- 基础元数据
  base_metadata := jsonb_build_object(
    'bot_name', COALESCE(p_bot_name, ''),
    'nationality', COALESCE(p_nationality, ''),
    'age', COALESCE(p_age, 0),
    'gender', COALESCE(p_gender, ''),
    'current_job', COALESCE(p_current_job, ''),
    'language', p_language
  );

  -- 删除旧的向量记录
  DELETE FROM bot_vectors WHERE bot_id = p_bot_id;

  -- 1. 基础信息向量（按表单字段顺序）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'basic_info',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_bot_name, '') != '' THEN CONCAT(label_name, '：', p_bot_name, '。') END,
      CASE WHEN COALESCE(p_nationality, '') != '' THEN CONCAT(label_nationality, '：', p_nationality, '。') END,
      CASE WHEN p_age IS NOT NULL THEN CONCAT(label_age, '：', p_age::text, '。') END,
      CASE WHEN COALESCE(p_gender, '') != '' THEN CONCAT(label_gender, '：', p_gender, '。') END,
      CASE WHEN COALESCE(p_height, '') != '' THEN CONCAT(label_height, '：', p_height, '。') END,
      CASE WHEN COALESCE(p_weight, '') != '' THEN CONCAT(label_weight, '：', p_weight, '。') END,
      CASE WHEN COALESCE(p_blood_type, '') != '' THEN CONCAT(label_blood_type, '：', p_blood_type, '。') END,
      CASE WHEN COALESCE(p_zodiac_sign, '') != '' THEN CONCAT(label_zodiac, '：', p_zodiac_sign, '。') END,
      CASE WHEN COALESCE(p_birth_date, '') != '' THEN CONCAT(label_birth_date, '：', p_birth_date, '。') END,
      CASE WHEN COALESCE(p_birth_place, '') != '' THEN CONCAT(label_birth_place, '：', p_birth_place, '。') END,
      CASE WHEN COALESCE(p_education_level, '') != '' THEN CONCAT(label_education_level, '：', p_education_level, '。') END,
      CASE WHEN COALESCE(p_graduate_school, '') != '' THEN CONCAT(label_graduate_school, '：', p_graduate_school, '。') END,
      CASE WHEN COALESCE(p_major, '') != '' THEN CONCAT(label_major, '：', p_major, '。') END,
      CASE WHEN COALESCE(p_current_address, '') != '' THEN CONCAT(label_current_address, '：', p_current_address, '。') END,
      CASE WHEN COALESCE(p_current_job, '') != '' THEN CONCAT(label_job, '：', p_current_job, '。') END,
      CASE WHEN COALESCE(p_work_address, '') != '' THEN CONCAT(label_work_address, '：', p_work_address, '。') END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'basic_identity'),
    2.0,
    insert_created_at,
    NOW()
  );

  -- 2. 生活偏好向量（按表单字段顺序）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'preferences',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_favorite_music, '') != '' THEN CONCAT(label_music, '：', p_favorite_music, '。') END,
      CASE WHEN COALESCE(p_favorite_movies, '') != '' THEN CONCAT(label_movies, '：', p_favorite_movies, '。') END,
      CASE WHEN COALESCE(p_favorite_fashion, '') != '' THEN CONCAT(label_fashion, '：', p_favorite_fashion, '。') END,
      CASE WHEN COALESCE(p_favorite_hairstyle, '') != '' THEN CONCAT(label_hairstyle, '：', p_favorite_hairstyle, '。') END,
      CASE WHEN COALESCE(p_favorite_food, '') != '' THEN CONCAT(label_food, '：', p_favorite_food, '。') END,
      CASE WHEN COALESCE(p_favorite_restaurants, '') != '' THEN CONCAT(label_restaurants, '：', p_favorite_restaurants, '。') END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'lifestyle_preferences'),
    1.4,
    insert_created_at,
    NOW()
  );

  -- 3. 性格特征向量（按表单字段顺序）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'personality',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_hobbies, '') != '' THEN CONCAT(label_hobbies, '：', p_hobbies, '。') END,
      CASE WHEN COALESCE(p_worldview, '') != '' THEN CONCAT(label_worldview, '：', p_worldview, '。') END,
      CASE WHEN COALESCE(p_life_philosophy, '') != '' THEN CONCAT(label_life_philosophy, '：', p_life_philosophy, '。') END,
      CASE WHEN COALESCE(p_values, '') != '' THEN CONCAT(label_values, '：', p_values, '。') END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'personality_traits'),
    1.8,
    insert_created_at,
    NOW()
  );

  -- 4. 人生经历向量（按表单字段顺序）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'experiences',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_childhood_experience, '') != '' THEN CONCAT(label_childhood_exp, '：', p_childhood_experience, '。') END,
      CASE WHEN COALESCE(p_childhood_stories, '') != '' THEN CONCAT(label_childhood_stories, '：', p_childhood_stories, '。') END,
      CASE WHEN COALESCE(p_growth_experience, '') != '' THEN CONCAT(label_growth_exp, '：', p_growth_experience, '。') END,
      CASE WHEN COALESCE(p_relationship_experience, '') != '' THEN CONCAT(label_relationship_exp, '：', p_relationship_experience, '。') END,
      CASE WHEN COALESCE(p_marital_status, '') != '' THEN CONCAT(label_marital_status, '：', p_marital_status, '。') END,
      CASE WHEN COALESCE(p_marriage_history, '') != '' THEN CONCAT(label_marriage_history, '：', p_marriage_history, '。') END,
      CASE WHEN COALESCE(p_work_experience, '') != '' THEN CONCAT(label_work_exp, '：', p_work_experience, '。') END,
      CASE WHEN COALESCE(p_business_experience, '') != '' THEN CONCAT(label_business_exp, '：', p_business_experience, '。') END,
      CASE WHEN COALESCE(p_investment_experience, '') != '' THEN CONCAT(label_investment_exp, '：', p_investment_experience, '。') END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'life_experiences'),
    1.6,
    insert_created_at,
    NOW()
  );

  -- 5. 未来梦想向量（按表单字段顺序）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'dreams',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_places_to_visit, '') != '' THEN CONCAT(label_places_to_visit, '：', p_places_to_visit, '。') END,
      CASE WHEN COALESCE(p_life_dreams, '') != '' THEN CONCAT(label_life_dreams, '：', p_life_dreams, '。') END,
      CASE WHEN COALESCE(p_future_thoughts, '') != '' THEN CONCAT(label_future_thoughts, '：', p_future_thoughts, '。') END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'dreams_future'),
    1.5,
    insert_created_at,
    NOW()
  );

  -- 6. 综合向量（包含所有信息的自然语言描述）
  INSERT INTO bot_vectors (bot_id, vector_type, content, metadata, search_weight, created_at, updated_at)
  VALUES (
    p_bot_id, 'comprehensive',
    TRIM(CONCAT_WS(
      ' ',
      CASE WHEN COALESCE(p_bot_name, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN CONCAT('Robot ', p_bot_name, '。')
             ELSE CONCAT('机器人', p_bot_name, '。') END
      END,
      CASE WHEN p_age IS NOT NULL OR COALESCE(p_gender, '') != '' OR COALESCE(p_nationality, '') != '' OR COALESCE(p_current_job, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Thông tin cơ bản：',
            CASE WHEN p_age IS NOT NULL THEN CONCAT('tuổi ', p_age::text) END,
            CASE WHEN COALESCE(p_gender, '') != '' THEN CONCAT('，', p_gender) END,
            CASE WHEN COALESCE(p_nationality, '') != '' THEN CONCAT('，người ', p_nationality) END,
            CASE WHEN COALESCE(p_current_job, '') != '' THEN CONCAT('，nghề nghiệp là ', p_current_job) END,
            '。'
          )
        ELSE
          CONCAT('基本信息：',
            CASE WHEN p_age IS NOT NULL THEN CONCAT('年龄', p_age::text, '岁') END,
            CASE WHEN COALESCE(p_gender, '') != '' THEN CONCAT('，', p_gender) END,
            CASE WHEN COALESCE(p_nationality, '') != '' THEN CONCAT('，', p_nationality, '人') END,
            CASE WHEN COALESCE(p_current_job, '') != '' THEN CONCAT('，职业是', p_current_job) END,
            '。'
          )
        END
      END,
      CASE WHEN COALESCE(p_values, '') != '' OR COALESCE(p_life_philosophy, '') != '' OR COALESCE(p_worldview, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Đặc điểm tính cách：',
            COALESCE(p_values, ''), 
            CASE WHEN COALESCE(p_life_philosophy, '') != '' THEN CONCAT(' ', p_life_philosophy) END,
            CASE WHEN COALESCE(p_worldview, '') != '' THEN CONCAT(' ', p_worldview) END,
            '。'
          )
        ELSE
          CONCAT('性格特征：',
            COALESCE(p_values, ''), 
            CASE WHEN COALESCE(p_life_philosophy, '') != '' THEN CONCAT(' ', p_life_philosophy) END,
            CASE WHEN COALESCE(p_worldview, '') != '' THEN CONCAT(' ', p_worldview) END,
            '。'
          )
        END
      END,
      CASE WHEN COALESCE(p_hobbies, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN CONCAT('Sở thích cá nhân：', p_hobbies, '。')
             ELSE CONCAT('兴趣爱好：', p_hobbies, '。') END
      END,
      CASE WHEN COALESCE(p_childhood_experience, '') != '' OR COALESCE(p_work_experience, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Kinh nghiệm cuộc sống：',
            COALESCE(p_childhood_experience, ''),
            CASE WHEN COALESCE(p_work_experience, '') != '' THEN CONCAT(' ', p_work_experience) END,
            '。'
          )
        ELSE
          CONCAT('人生经历：',
            COALESCE(p_childhood_experience, ''),
            CASE WHEN COALESCE(p_work_experience, '') != '' THEN CONCAT(' ', p_work_experience) END,
            '。'
          )
        END
      END,
      CASE WHEN COALESCE(p_favorite_music, '') != '' OR COALESCE(p_favorite_movies, '') != '' OR COALESCE(p_favorite_food, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Sở thích cuộc sống：',
            CASE WHEN COALESCE(p_favorite_music, '') != '' THEN CONCAT('thích nhạc ', p_favorite_music) END,
            CASE WHEN COALESCE(p_favorite_movies, '') != '' THEN CONCAT('，phim ', p_favorite_movies) END,
            CASE WHEN COALESCE(p_favorite_food, '') != '' THEN CONCAT('，ẩm thực ', p_favorite_food) END,
            '。'
          )
        ELSE
          CONCAT('生活偏好：',
            CASE WHEN COALESCE(p_favorite_music, '') != '' THEN CONCAT('喜欢', p_favorite_music, '音乐') END,
            CASE WHEN COALESCE(p_favorite_movies, '') != '' THEN CONCAT('，', p_favorite_movies, '电影') END,
            CASE WHEN COALESCE(p_favorite_food, '') != '' THEN CONCAT('，', p_favorite_food, '美食') END,
            '。'
          )
        END
      END,
      CASE WHEN COALESCE(p_life_dreams, '') != '' OR COALESCE(p_future_thoughts, '') != '' OR COALESCE(p_places_to_visit, '') != '' THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Ước mơ tương lai：',
            COALESCE(p_life_dreams, ''),
            CASE WHEN COALESCE(p_future_thoughts, '') != '' THEN CONCAT(' ', p_future_thoughts) END,
            CASE WHEN COALESCE(p_places_to_visit, '') != '' THEN CONCAT(' ', p_places_to_visit) END,
            '。'
          )
        ELSE
          CONCAT('未来梦想：',
            COALESCE(p_life_dreams, ''),
            CASE WHEN COALESCE(p_future_thoughts, '') != '' THEN CONCAT(' ', p_future_thoughts) END,
            CASE WHEN COALESCE(p_places_to_visit, '') != '' THEN CONCAT(' ', p_places_to_visit) END,
            '。'
          )
        END
      END
    )),
    base_metadata || jsonb_build_object('search_purpose', 'comprehensive_profile'),
    2.2,
    insert_created_at,
    NOW()
  );
END;
$$;

COMMIT; 