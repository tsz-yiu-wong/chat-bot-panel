-- 机器人人设向量化更新脚本
-- 用于更新现有数据库，添加完整字段支持

-- ===== 更新向量化函数 =====
-- 支持多语言和完整字段的向量化函数
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
  p_birth_date DATE DEFAULT NULL,
  p_birth_place TEXT DEFAULT '',
  p_education_level TEXT DEFAULT '',
  p_graduate_school TEXT DEFAULT '',
  p_major TEXT DEFAULT '',
  p_current_address TEXT DEFAULT '',
  p_current_job TEXT DEFAULT '',
  p_work_address TEXT DEFAULT '',
  p_daily_routine JSONB DEFAULT NULL,
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
  p_life_timeline JSONB DEFAULT NULL,
  p_family_members JSONB DEFAULT NULL,
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
  label_daily_routine TEXT;
  label_life_timeline TEXT;
  label_family_members TEXT;
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
    label_daily_routine := 'Thói quen hàng ngày';
    label_life_timeline := 'Dòng thời gian cuộc đời';
    label_family_members := 'Thành viên gia đình';
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
    label_daily_routine := '日常作息';
    label_life_timeline := '人生时间轴';
    label_family_members := '家庭成员';
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
      CASE WHEN p_birth_date IS NOT NULL THEN CONCAT(label_birth_date, '：', p_birth_date::text, '。') END,
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
      CASE WHEN p_daily_routine IS NOT NULL AND jsonb_typeof(p_daily_routine) = 'object' THEN 
        CONCAT(label_daily_routine, '：',
          CASE WHEN p_daily_routine->>'wake_up' IS NOT NULL THEN CONCAT('起床时间 ', p_daily_routine->>'wake_up', '，') END,
          CASE WHEN p_daily_routine->>'work_hours' IS NOT NULL THEN CONCAT('工作时间 ', p_daily_routine->>'work_hours', '，') END,
          CASE WHEN p_daily_routine->>'rest_time' IS NOT NULL THEN CONCAT('休息时间 ', p_daily_routine->>'rest_time', '。') END
        ) 
      END,
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
      CASE WHEN COALESCE(p_investment_experience, '') != '' THEN CONCAT(label_investment_exp, '：', p_investment_experience, '。') END,
      CASE WHEN p_life_timeline IS NOT NULL AND jsonb_typeof(p_life_timeline) = 'array' AND jsonb_array_length(p_life_timeline) > 0 THEN 
        CONCAT(label_life_timeline, '：', (
          SELECT string_agg(
            CONCAT(item->>'year', '年', 
              CASE WHEN item->>'month' IS NOT NULL THEN CONCAT(item->>'month', '月') END, 
              ' ', item->>'event'), '，'
          ) 
          FROM jsonb_array_elements(p_life_timeline) AS item
        ), '。') 
      END,
      CASE WHEN p_family_members IS NOT NULL AND jsonb_typeof(p_family_members) = 'array' AND jsonb_array_length(p_family_members) > 0 THEN 
        CONCAT(label_family_members, '：', (
          SELECT string_agg(
            CONCAT(item->>'relationship', 
              CASE WHEN item->>'name' IS NOT NULL THEN CONCAT(' ', item->>'name') END,
              CASE WHEN item->>'description' IS NOT NULL THEN CONCAT(' ', item->>'description') END
            ), '，'
          ) 
          FROM jsonb_array_elements(p_family_members) AS item
        ), '。') 
      END
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
      CASE WHEN COALESCE(p_childhood_experience, '') != '' OR COALESCE(p_work_experience, '') != '' OR p_life_timeline IS NOT NULL OR p_family_members IS NOT NULL THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Kinh nghiệm cuộc sống：',
            COALESCE(p_childhood_experience, ''),
            CASE WHEN COALESCE(p_work_experience, '') != '' THEN CONCAT(' ', p_work_experience) END,
            CASE WHEN p_life_timeline IS NOT NULL AND jsonb_typeof(p_life_timeline) = 'array' AND jsonb_array_length(p_life_timeline) > 0 THEN 
              CONCAT(' Có ', jsonb_array_length(p_life_timeline)::text, ' sự kiện quan trọng trong cuộc đời') 
            END,
            CASE WHEN p_family_members IS NOT NULL AND jsonb_typeof(p_family_members) = 'array' AND jsonb_array_length(p_family_members) > 0 THEN 
              CONCAT(' Có ', jsonb_array_length(p_family_members)::text, ' thành viên gia đình') 
            END,
            '。'
          )
        ELSE
          CONCAT('人生经历：',
            COALESCE(p_childhood_experience, ''),
            CASE WHEN COALESCE(p_work_experience, '') != '' THEN CONCAT(' ', p_work_experience) END,
            CASE WHEN p_life_timeline IS NOT NULL AND jsonb_typeof(p_life_timeline) = 'array' AND jsonb_array_length(p_life_timeline) > 0 THEN 
              CONCAT(' 有', jsonb_array_length(p_life_timeline)::text, '个重要人生节点') 
            END,
            CASE WHEN p_family_members IS NOT NULL AND jsonb_typeof(p_family_members) = 'array' AND jsonb_array_length(p_family_members) > 0 THEN 
              CONCAT(' 有', jsonb_array_length(p_family_members)::text, '位家庭成员') 
            END,
            '。'
          )
        END
      END,
      CASE WHEN COALESCE(p_favorite_music, '') != '' OR COALESCE(p_favorite_movies, '') != '' OR COALESCE(p_favorite_food, '') != '' OR p_daily_routine IS NOT NULL THEN 
        CASE WHEN p_language = 'vi' THEN
          CONCAT('Sở thích cuộc sống：',
            CASE WHEN COALESCE(p_favorite_music, '') != '' THEN CONCAT('thích nhạc ', p_favorite_music) END,
            CASE WHEN COALESCE(p_favorite_movies, '') != '' THEN CONCAT('，phim ', p_favorite_movies) END,
            CASE WHEN COALESCE(p_favorite_food, '') != '' THEN CONCAT('，ẩm thực ', p_favorite_food) END,
            CASE WHEN p_daily_routine IS NOT NULL AND jsonb_typeof(p_daily_routine) = 'object' THEN '，có thói quen sinh hoạt đều đặn' END,
            '。'
          )
        ELSE
          CONCAT('生活偏好：',
            CASE WHEN COALESCE(p_favorite_music, '') != '' THEN CONCAT('喜欢', p_favorite_music, '音乐') END,
            CASE WHEN COALESCE(p_favorite_movies, '') != '' THEN CONCAT('，', p_favorite_movies, '电影') END,
            CASE WHEN COALESCE(p_favorite_food, '') != '' THEN CONCAT('，', p_favorite_food, '美食') END,
            CASE WHEN p_daily_routine IS NOT NULL AND jsonb_typeof(p_daily_routine) = 'object' THEN '，有规律的作息习惯' END,
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

-- ===== 更新触发器函数（如果需要） =====
-- 更新自动向量化触发器，使用新的函数
DROP TRIGGER IF EXISTS auto_vectorize_bot_personality_trigger ON bot_personalities;

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
    -- 使用新的向量化函数
    PERFORM create_bot_personality_vectors_with_language(
      NEW.id,
      NEW.bot_name,
      NEW.nationality,
      NEW.age,
      NEW.gender,
      NEW.height,
      NEW.weight,
      NEW.blood_type,
      NEW.zodiac_sign,
      NEW.birth_date,
      NEW.birth_place,
      NEW.education_level,
      NEW.graduate_school,
      NEW.major,
      NEW.current_address,
      NEW.current_job,
      NEW.work_address,
      NEW.daily_routine,
      NEW.favorite_music,
      NEW.favorite_movies,
      NEW.favorite_fashion,
      NEW.favorite_hairstyle,
      NEW.favorite_food,
      NEW.favorite_restaurants,
      NEW.hobbies,
      NEW.worldview,
      NEW.life_philosophy,
      NEW.values,
      NEW.life_timeline,
      NEW.family_members,
      NEW.childhood_experience,
      NEW.childhood_stories,
      NEW.growth_experience,
      NEW.relationship_experience,
      NEW.marital_status,
      NEW.marriage_history,
      NEW.work_experience,
      NEW.business_experience,
      NEW.investment_experience,
      NEW.places_to_visit,
      NEW.life_dreams,
      NEW.future_thoughts,
      'zh'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 重新创建触发器
CREATE TRIGGER auto_vectorize_bot_personality_trigger
  AFTER INSERT OR UPDATE ON bot_personalities
  FOR EACH ROW EXECUTE FUNCTION auto_vectorize_bot_personality();

-- 完成提示
-- 运行完成后，建议执行以下操作：
-- 1. 运行 node scripts/test-db-function.js 验证函数更新
-- 2. 运行 node scripts/vectorize-all-bots.js --force 重新向量化所有机器人
-- 3. 在页面上测试向量搜索功能 