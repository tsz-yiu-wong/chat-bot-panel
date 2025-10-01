import { supabaseAdmin, generateEmbedding } from './utils.ts';

// =================================================================
// Multilingual Labels for Character Vectorization
// =================================================================
const VECTORIZATION_LABELS = {
  zh: {
    // Core Information
    name: "你的名字是：",
    age: "年龄：",
    gender: "性别：",
    nationality: "国籍：",
    ancestral_home: "祖籍：",
    job_title: "你的职业是：",
    // Personal Information
    height_cm: "身高(cm)：",
    weight_kg: "体重(kg)：",
    blood_type: "血型：",
    zodiac: "星座：",
    birth_date: "生日：",
    birth_place: "出生地：",
    // Life Information
    current_address: "你的现居地是：",
    work_address: "你工作地是：",
    daily_routine: "你的日常生活：",
    favourite: "你的喜好：",
    family_member: "你的家庭成员：",
    // Worldview
    worldview: "你的世界观：",
    life_philosophy: "你的人生哲学：",
    personal_values: "你的价值观：",
    // Dreams
    future_plan: "你的未来计划：",
    wish_place: "你想去的地方：",
    life_dream: "你的人生梦想是：",
    // Experience
    education_exp: "你的教育经历：",
    work_exp: "你的工作经历：",
    life_event: "你的人生大事：",
    // Relationship
    marital_status: "你当前的婚姻状态是：",
    relationship_exp: "你的感情经历是：",
    // Combined Facets
    personal_identity: "你的个人基本信息：",
    values_and_worldview: "你的价值观体系：",
    dreams_and_aspirations: "你的梦想与愿景：",
    life_experiences: "你的人生经历：",
    daily_life: "你的日常生活：",
    locations: "你的地理位置：",
    relationship: "你的感情状态：",
    // Self Evaluation (全局兜底)
    self_evaluation: "你的自我评价：",
  },
  en: {
    // Core Information
    name: "Your name is: ",
    age: "Age: ",
    gender: "Gender: ",
    nationality: "Nationality: ",
    ancestral_home: "Ancestral Home: ",
    job_title: "Your job is: ",
    // Personal Information
    height_cm: "Height(cm): ",
    weight_kg: "Weight(kg): ",
    blood_type: "Blood Type: ",
    zodiac: "Zodiac: ",
    birth_date: "Date of Birth: ",
    birth_place: "Place of Birth: ",
    // Life Information
    current_address: "Your current address is: ",
    work_address: "Your work address is: ",
    daily_routine: "Your daily routine: ",
    favourite: "Your favourites: ",
    family_member: "Your family members: ",
    // Worldview
    worldview: "Your worldview is: ",
    life_philosophy: "Your life philosophy is: ",
    personal_values: "Your personal values are: ",
    // Dreams
    future_plan: "Your future plan is: ",
    wish_place: "You want to go to: ",
    life_dream: "Your life dream is: ",
    // Experience
    education_exp: "Your education experience: ",
    work_exp: "Your work experience: ",
    life_event: "Your life events: ",
    // Relationship
    marital_status: "Your current marital status is: ",
    relationship_exp: "Your relationship experience: ",
    // Combined Facets
    personal_identity: "Your personal identity: ",
    values_and_worldview: "Your values and worldview: ",
    dreams_and_aspirations: "Your dreams and aspirations: ",
    life_experiences: "Your life experiences: ",
    daily_life: "Your daily life: ",
    locations: "Your locations: ",
    relationship: "Your relationship status: ",
    // Self Evaluation (全局兜底)
    self_evaluation: "Your self-evaluation: ",
  },
  vi: {
    // Core Information
    name: "Tên bạn là: ",
    age: "Tuổi: ",
    gender: "Giới tính: ",
    nationality: "Quốc tịch: ",
    ancestral_home: "Quê quán: ",
    job_title: "Nghề nghiệp của bạn là: ",
    // Personal Information
    height_cm: "Chiều cao (cm): ",
    weight_kg: "Cân nặng (kg): ",
    blood_type: "Nhóm máu: ",
    zodiac: "Cung hoàng đạo: ",
    birth_date: "Ngày sinh: ",
    birth_place: "Nơi sinh: ",
    // Life Information
    current_address: "Địa chỉ hiện tại của bạn là: ",
    work_address: "Nơi làm việc của bạn là: ",
    daily_routine: "Thói quen hàng ngày của bạn: ",
    favourite: "Sở thích của bạn: ",
    family_member: "Thành viên gia đình bạn: ",
    // Worldview
    worldview: "Thế giới quan của bạn: ",
    life_philosophy: "Triết lý sống của bạn: ",
    personal_values: "Giá trị cá nhân của bạn: ",
    // Dreams
    future_plan: "Kế hoạch tương lai của bạn: ",
    wish_place: "Nơi bạn muốn đến: ",
    life_dream: "Ước mơ của bạn là: ",
    // Experience
    education_exp: "Kinh nghiệm học vấn của bạn: ",
    work_exp: "Kinh nghiệm làm việc của bạn: ",
    life_event: "Sự kiện trong đời bạn: ",
    // Relationship
    marital_status: "Tình trạng hôn nhân hiện tại của bạn là: ",
    relationship_exp: "Kinh nghiệm tình cảm của bạn: ",
    // Combined Facets
    personal_identity: "Danh tính cá nhân của bạn: ",
    values_and_worldview: "Hệ thống giá trị và thế giới quan của bạn: ",
    dreams_and_aspirations: "Ước mơ và khát vọng của bạn: ",
    life_experiences: "Kinh nghiệm cuộc sống của bạn: ",
    daily_life: "Cuộc sống hàng ngày của bạn: ",
    locations: "Vị trí địa lý của bạn: ",
    relationship: "Tình trạng mối quan hệ của bạn: ",
    // Self Evaluation (全局兜底)
    self_evaluation: "Tự đánh giá của bạn: ",
  },
};

type Facet = keyof typeof VECTORIZATION_LABELS['en'];

/**
 * Handles vectorization for the 'characters' table.
 * 
 * 策略：方案A - 7个语义主题向量 + 1个自我评价向量
 * 1. personal_identity: 核心身份信息
 * 2. values_and_worldview: 价值观体系
 * 3. dreams_and_aspirations: 梦想与愿景
 * 4. life_experiences: 人生经历
 * 5. daily_life: 日常生活
 * 6. locations: 地理位置
 * 7. relationship: 感情状态
 * 8. self_evaluation: 自我评价（全局兜底）
 */
export async function handleCharacter(record: Record<string, any>) {
  const language = (record.language || 'en') as keyof typeof VECTORIZATION_LABELS;
  const labels = VECTORIZATION_LABELS[language] || VECTORIZATION_LABELS.en;

  console.log(`[characters:${record.id}] Starting vectorization for character, language: ${language}.`);

  const vectorsToUpsert = [];

  // =====================================================================
  // 1. 核心身份信息（personal_identity）
  // =====================================================================
  const personalIdentityFields: (keyof typeof labels)[] = [
    'name', 'age', 'gender', 'nationality', 'ancestral_home', 'job_title',
    'height_cm', 'weight_kg', 'blood_type', 'zodiac', 'birth_date', 'birth_place',
  ];

  const personalIdentityParts: string[] = [];
  for (const field of personalIdentityFields) {
    if (record[field]) {
      personalIdentityParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (personalIdentityParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.personal_identity}\n${personalIdentityParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'personal_identity'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'personal_identity',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 2. 价值观体系（values_and_worldview）
  // =====================================================================
  const valuesFields: (keyof typeof labels)[] = ['worldview', 'life_philosophy', 'personal_values'];
  const valuesParts: string[] = [];
  
  for (const field of valuesFields) {
    if (record[field]) {
      valuesParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (valuesParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.values_and_worldview}\n${valuesParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'values_and_worldview'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'values_and_worldview',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 3. 梦想与愿景（dreams_and_aspirations）
  // =====================================================================
  const dreamsFields: (keyof typeof labels)[] = ['future_plan', 'wish_place', 'life_dream'];
  const dreamsParts: string[] = [];
  
  for (const field of dreamsFields) {
    if (record[field]) {
      dreamsParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (dreamsParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.dreams_and_aspirations}\n${dreamsParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'dreams_and_aspirations'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'dreams_and_aspirations',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 4. 人生经历（life_experiences）
  // =====================================================================
  const experiencesFields: (keyof typeof labels)[] = ['education_exp', 'work_exp', 'life_event'];
  const experiencesParts: string[] = [];
  
  for (const field of experiencesFields) {
    if (record[field]) {
      experiencesParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (experiencesParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.life_experiences}\n${experiencesParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'life_experiences'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'life_experiences',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 5. 日常生活（daily_life）
  // =====================================================================
  const dailyLifeFields: (keyof typeof labels)[] = ['daily_routine', 'favourite', 'family_member'];
  const dailyLifeParts: string[] = [];
  
  for (const field of dailyLifeFields) {
    if (record[field]) {
      dailyLifeParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (dailyLifeParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.daily_life}\n${dailyLifeParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'daily_life'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'daily_life',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 6. 地理位置（locations）
  // =====================================================================
  const locationsFields: (keyof typeof labels)[] = ['current_address', 'work_address'];
  const locationsParts: string[] = [];
  
  for (const field of locationsFields) {
    if (record[field]) {
      locationsParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (locationsParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.locations}\n${locationsParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'locations'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'locations',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 7. 感情状态（relationship）
  // =====================================================================
  const relationshipFields: (keyof typeof labels)[] = ['marital_status', 'relationship_exp'];
  const relationshipParts: string[] = [];
  
  for (const field of relationshipFields) {
    if (record[field]) {
      relationshipParts.push(`- ${labels[field]}${record[field]}`);
    }
  }

  if (relationshipParts.length > 0) {
    // 使用列表格式，结构清晰
    const content = `${labels.relationship}\n${relationshipParts.join('\n')}`;
    console.log(`[characters:${record.id}] Processing facet 'relationship'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'relationship',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // 8. 自我评价（self_evaluation）- 全局兜底向量
  // =====================================================================
  if (record.self_evaluation) {
    const content = `${labels.self_evaluation}${record.self_evaluation}`;
    console.log(`[characters:${record.id}] Processing facet 'self_evaluation'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'self_evaluation',
      content: content,
      language: language,
      embedding: await generateEmbedding(content),
    });
  }

  // =====================================================================
  // Upsert all generated vectors
  // =====================================================================
  if (vectorsToUpsert.length > 0) {
    console.log(`[characters:${record.id}] Upserting ${vectorsToUpsert.length} vectors...`);
    const { error } = await supabaseAdmin.from('character_vectors').upsert(vectorsToUpsert, {
      onConflict: 'character_id,facet',
    });
    if (error) {
      console.error(`[characters:${record.id}] Failed to upsert character vectors:`, error);
      throw new Error(`Failed to upsert character vectors: ${error.message}`);
    }
    console.log(`[characters:${record.id}] Successfully upserted character vectors.`);
  } else {
    console.log(`[characters:${record.id}] No content found for vectorization, skipping.`);
  }
}
