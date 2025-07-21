# 机器人人设向量化修复 - 2025-01-14

## 问题描述

用户反馈机器人人设向量化有问题，并没有按照网页上填写的标签分类和标签分类下的内容来生成向量。

经过分析发现，向量化时传递给数据库函数的字段不完整，遗漏了很多页面表单中填写的数据。

## 问题分析

### 1. 字段映射不完整

在 `src/app/api/bot-personality/vectorize/route.ts` 中，向量化API调用时只传递了部分字段：

**遗漏的基础字段：**
- `height`, `weight`, `blood_type`, `zodiac_sign`
- `birth_date`, `birth_place`
- `education_level`, `graduate_school`, `major`
- `current_address`, `work_address`
- `favorite_hairstyle`, `favorite_restaurants`
- `childhood_stories`, `growth_experience`
- `marital_status`, `marriage_history`

**遗漏的复杂字段：**
- `daily_routine` (JSONB) - 日常作息
- `life_timeline` (JSONB) - 人生时间轴
- `family_members` (JSONB) - 家庭成员

### 2. 数据库函数支持不完整

数据库函数 `create_bot_personality_vectors_with_language` 缺少对复杂JSONB字段的支持。

## 修复方案

### 1. 更新数据库向量化函数

**文件：** `database/bot_personality_vectors_schema.sql`

#### 添加复杂字段参数

```sql
CREATE OR REPLACE FUNCTION create_bot_personality_vectors_with_language(
  -- ... 其他参数 ...
  p_daily_routine JSONB DEFAULT NULL,
  p_life_timeline JSONB DEFAULT NULL,
  p_family_members JSONB DEFAULT NULL,
  -- ... 其他参数 ...
)
```

#### 添加多语言标签

```sql
-- 中文标签
label_daily_routine := '日常作息';
label_life_timeline := '人生时间轴';
label_family_members := '家庭成员';

-- 越南文标签
label_daily_routine := 'Thói quen hàng ngày';
label_life_timeline := 'Dòng thời gian cuộc đời';
label_family_members := 'Thành viên gia đình';
```

#### 更新向量生成逻辑

1. **生活偏好向量** - 添加日常作息处理：
```sql
CASE WHEN p_daily_routine IS NOT NULL AND jsonb_typeof(p_daily_routine) = 'object' THEN 
  CONCAT(label_daily_routine, '：',
    CASE WHEN p_daily_routine->>'wake_up' IS NOT NULL THEN CONCAT('起床时间 ', p_daily_routine->>'wake_up', '，') END,
    CASE WHEN p_daily_routine->>'work_hours' IS NOT NULL THEN CONCAT('工作时间 ', p_daily_routine->>'work_hours', '，') END,
    CASE WHEN p_daily_routine->>'rest_time' IS NOT NULL THEN CONCAT('休息时间 ', p_daily_routine->>'rest_time', '。') END
  ) 
END
```

2. **人生经历向量** - 添加时间轴和家庭成员处理：
```sql
-- 人生时间轴
CASE WHEN p_life_timeline IS NOT NULL AND jsonb_typeof(p_life_timeline) = 'array' AND jsonb_array_length(p_life_timeline) > 0 THEN 
  CONCAT(label_life_timeline, '：', (
    SELECT string_agg(
      CONCAT(item->>'year', '年', 
        CASE WHEN item->>'month' IS NOT NULL THEN CONCAT(item->>'month', '月') END, 
        ' ', item->>'event'), '，'
    ) 
    FROM jsonb_array_elements(p_life_timeline) AS item
  ), '。') 
END

-- 家庭成员
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
```

3. **综合向量** - 添加复杂字段的概要信息：
```sql
-- 在人生经历部分添加
CASE WHEN p_life_timeline IS NOT NULL AND jsonb_typeof(p_life_timeline) = 'array' AND jsonb_array_length(p_life_timeline) > 0 THEN 
  CONCAT(' 有', jsonb_array_length(p_life_timeline)::text, '个重要人生节点') 
END,
CASE WHEN p_family_members IS NOT NULL AND jsonb_typeof(p_family_members) = 'array' AND jsonb_array_length(p_family_members) > 0 THEN 
  CONCAT(' 有', jsonb_array_length(p_family_members)::text, '位家庭成员') 
END

-- 在生活偏好部分添加
CASE WHEN p_daily_routine IS NOT NULL AND jsonb_typeof(p_daily_routine) = 'object' THEN '，有规律的作息习惯' END
```

### 2. 更新API调用

**文件：** `src/app/api/bot-personality/vectorize/route.ts`

添加所有支持的字段传递：

```javascript
const { error: functionError } = await supabase.rpc('create_bot_personality_vectors_with_language', {
  p_bot_id: botId,
  p_bot_name: personalityData.bot_name || '',
  // ... 基础字段 ...
  p_height: personalityData.height || '',
  p_weight: personalityData.weight || '',
  p_blood_type: personalityData.blood_type || '',
  p_zodiac_sign: personalityData.zodiac_sign || '',
  p_birth_date: personalityData.birth_date || '',
  p_birth_place: personalityData.birth_place || '',
  p_education_level: personalityData.education_level || '',
  p_graduate_school: personalityData.graduate_school || '',
  p_major: personalityData.major || '',
  p_current_address: personalityData.current_address || '',
  p_work_address: personalityData.work_address || '',
  p_favorite_hairstyle: personalityData.favorite_hairstyle || '',
  p_favorite_restaurants: personalityData.favorite_restaurants || '',
  p_childhood_stories: personalityData.childhood_stories || '',
  p_growth_experience: personalityData.growth_experience || '',
  p_marital_status: personalityData.marital_status || '',
  p_marriage_history: personalityData.marriage_history || '',
  // ... 复杂字段 ...
  p_daily_routine: personalityData.daily_routine || null,
  p_life_timeline: personalityData.life_timeline || null,
  p_family_members: personalityData.family_members || null,
  // ... 其他字段 ...
  p_language: language || 'zh'
});
```

### 3. 创建测试脚本

**文件：** `scripts/test-bot-vectorization.js`

创建了comprehensive测试脚本来验证修复效果：

1. 检查现有机器人数据的字段完整性
2. 重新向量化机器人进行测试
3. 验证向量内容是否包含完整字段
4. 测试向量搜索功能
5. 如果没有数据，自动创建包含完整字段的测试机器人

## 修复效果

### 1. 字段覆盖完整性

修复后，向量化将包含所有表单字段：

- ✅ 基础信息：姓名、国籍、年龄、性别、身高、体重、血型、星座、出生日期、出生地
- ✅ 教育背景：学历、毕业院校、专业
- ✅ 地址信息：现居地址、工作地址
- ✅ 生活偏好：音乐、电影、时尚、发型、美食、餐厅
- ✅ 复杂字段：日常作息、人生时间轴、家庭成员
- ✅ 性格特征：兴趣爱好、世界观、人生观、价值观
- ✅ 人生经历：童年经历、童年故事、成长经历、感情经历、婚姻状况、婚姻经历、工作经历、创业经历、投资经历
- ✅ 未来梦想：想去的地方、人生梦想、对未来人生的想法

### 2. 向量类型优化

向量按照表单分类正确生成：

1. **basic_info** - 基础信息向量
2. **preferences** - 生活偏好向量（包含日常作息）
3. **personality** - 性格特征向量  
4. **experiences** - 人生经历向量（包含时间轴和家庭成员）
5. **dreams** - 未来梦想向量
6. **comprehensive** - 综合向量（自然语言描述）

### 3. 多语言支持

支持中文和越南文的标签和内容生成。

## 测试验证

使用测试脚本验证修复效果：

```bash
cd scripts
node test-bot-vectorization.js
```

## 注意事项

1. 需要重新向量化现有的机器人数据以应用修复
2. 复杂字段（JSONB）需要正确的数据格式
3. 向量生成时会自动处理空值和无效数据
4. 保持向量权重的合理分配（basic_info: 2.0, comprehensive: 2.2等）

## 后续优化

1. 考虑添加向量生成的批量更新接口
2. 优化复杂字段的文本转换逻辑
3. 增加向量内容的质量检测
4. 考虑根据字段重要性动态调整向量权重 