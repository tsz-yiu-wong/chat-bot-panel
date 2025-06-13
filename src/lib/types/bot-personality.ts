// 机器人人设相关类型定义

export interface DailyRoutine {
  wake_up?: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  work_hours?: string;
  rest_time?: string;
  vacation?: string;
}

export interface LifeTimelineEvent {
  year: number;
  month?: number;
  event: string;
}

export interface FamilyMember {
  relationship: string; // 关系
  name?: string; // 名字
  description?: string; // 描述
}

export interface BotPersonality {
  id?: string;
  user_id?: string;
  bot_name: string;
  
  // Basic Information 基础信息
  nationality?: string;
  age?: number;
  gender?: string;
  height?: string;
  weight?: string;
  blood_type?: string;
  zodiac_sign?: string;
  birth_date?: string;
  birth_place?: string;
  current_address?: string;
  current_job?: string;
  work_address?: string;
  
  // Lifestyle 作息和生活习惯
  daily_routine?: DailyRoutine;
  
  // Preferences 喜好
  favorite_music?: string;
  favorite_movies?: string;
  favorite_fashion?: string;
  favorite_hairstyle?: string;
  favorite_food?: string;
  favorite_restaurants?: string;
  
  // Education 教育背景
  education_level?: string;
  graduate_school?: string;
  major?: string;
  
  // Marriage 婚姻状况
  marital_status?: string;
  marriage_history?: string;
  
  // Background 背景 (保留旧字段以兼容)
  education_background?: string;
  
  // Interests and Values 兴趣和价值观
  hobbies?: string;
  worldview?: string;
  life_philosophy?: string;
  values?: string;
  
  // Life Timeline and Family 人生时间轴和家庭
  life_timeline?: LifeTimelineEvent[];
  family_members?: FamilyMember[];
  
  // Life Experiences 人生经历
  childhood_experience?: string;
  childhood_stories?: string;
  growth_experience?: string;
  relationship_experience?: string;
  work_experience?: string;
  business_experience?: string;
  investment_experience?: string;
  
  // Dreams and Future 梦想和未来
  places_to_visit?: string;
  life_dreams?: string;
  future_thoughts?: string;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface BotImage {
  id?: string;
  bot_id: string;
  image_type: 'personal' | 'lifestyle' | 'work' | 'hobby' | 'travel';
  image_url: string;
  image_name?: string;
  description?: string;
  sort_order?: number;
  created_at?: string;
}

export interface BotPersonalityWithImages extends BotPersonality {
  images?: BotImage[];
}

// 表单分类
export type PersonalityCategory = 
  | 'basic_info' 
  | 'lifestyle' 
  | 'preferences' 
  | 'values' 
  | 'experiences' 
  | 'dreams' 
  | 'images';

// 表单字段组
export interface FormFieldGroup {
  category: PersonalityCategory;
  fields: string[];
}

export const FORM_FIELD_GROUPS: FormFieldGroup[] = [
  {
    category: 'basic_info',
    fields: [
      'bot_name', 'nationality', 'age', 'gender', 'height', 'weight', 
      'blood_type', 'zodiac_sign', 'birth_date', 'birth_place',
      'education_level', 'graduate_school', 'major',
      'current_address', 'current_job', 'work_address'
    ]
  },
  {
    category: 'lifestyle',
    fields: ['daily_routine']
  },
  {
    category: 'preferences',
    fields: [
      'favorite_music', 'favorite_movies', 'favorite_fashion',
      'favorite_hairstyle', 'favorite_food', 'favorite_restaurants'
    ]
  },
  {
    category: 'values',
    fields: ['hobbies', 'worldview', 'life_philosophy', 'values']
  },
  {
    category: 'experiences',
    fields: [
      'life_timeline', 'family_members', 'childhood_experience',
      'childhood_stories', 'growth_experience', 'relationship_experience',
      'marital_status', 'marriage_history',
      'work_experience', 'business_experience', 'investment_experience'
    ]
  },
  {
    category: 'dreams',
    fields: ['places_to_visit', 'life_dreams', 'future_thoughts']
  }
]; 