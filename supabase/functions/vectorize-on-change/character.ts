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
    personal_information: "你的个人信息：",
  },
  en: {
    // Core Information
    name: "Your name is: ",
    age: "Age: ",
    gender: "Gender: ",
    nationality: "Nationality: ",
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
    personal_information: "Your personal information: ",
  },
  vi: {
    // Core Information
    name: "Tên bạn là: ",
    age: "Tuổi: ",
    gender: "Giới tính: ",
    nationality: "Quốc tịch: ",
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
    personal_information: "Thông tin cá nhân của bạn: ",
  },
};

type Facet = keyof typeof VECTORIZATION_LABELS['en'];

/**
 * Handles vectorization for the 'characters' table.
 */
export async function handleCharacter(record: Record<string, any>) {
  const language = (record.language || 'en') as keyof typeof VECTORIZATION_LABELS;
  const labels = VECTORIZATION_LABELS[language] || VECTORIZATION_LABELS.en;

  console.log(`[characters:${record.id}] Starting vectorization for character, language: ${language}.`);

  const vectorsToUpsert = [];

  // Individual facets to process
  const individualFacets: Facet[] = [
    'worldview', 'life_philosophy', 'personal_values',
    'future_plan', 'wish_place', 'life_dream',
    'daily_routine', 'favourite', 'family_member',
    'education_exp', 'work_exp', 'life_event',
    'current_address', 'work_address',
  ];

  for (const facet of individualFacets) {
    if (record[facet]) {
      const contentWithLabel = `${labels[facet]}${record[facet]}`;
      console.log(`[characters:${record.id}] Processing facet '${facet}'.`);
      vectorsToUpsert.push({
        character_id: record.id,
        facet: facet,
        content: contentWithLabel,
        language: language,
        embedding: await generateEmbedding(contentWithLabel),
      });
    }
  }

  // Handle combined relationship facet
  let relationshipContent = '';
  if (record.marital_status) {
    relationshipContent += `${labels.marital_status}${record.marital_status}`;
  }
  if (record.relationship_exp) {
    if (relationshipContent) {
      relationshipContent += `，${labels.relationship_exp}${record.relationship_exp}`;
    } else {
      relationshipContent += `${labels.relationship_exp}${record.relationship_exp}`;
    }
  }

  if (relationshipContent) {
    console.log(`[characters:${record.id}] Processing combined facet 'relationship_exp'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'relationship_exp',
      content: relationshipContent,
      language: language,
      embedding: await generateEmbedding(relationshipContent),
    });
  }

  // Handle combined personal information facet
  const personalInfoFields: (keyof typeof labels)[] = [
    'name', 'age', 'gender', 'nationality', 'job_title', 'height_cm',
    'weight_kg', 'blood_type', 'zodiac', 'birth_date', 'birth_place',
  ];

  let personalInfoString = '';
  for (const field of personalInfoFields) {
    if (record[field]) {
      personalInfoString += `${labels[field]}${record[field]} `;
    }
  }

  if (personalInfoString.trim()) {
    const contentWithLabel = `${labels.personal_information}${personalInfoString.trim()}`;
    console.log(`[characters:${record.id}] Processing combined facet 'personal_information'.`);
    vectorsToUpsert.push({
      character_id: record.id,
      facet: 'personal_information',
      content: contentWithLabel,
      language: language,
      embedding: await generateEmbedding(contentWithLabel),
    });
  }

  // Upsert all generated vectors
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
