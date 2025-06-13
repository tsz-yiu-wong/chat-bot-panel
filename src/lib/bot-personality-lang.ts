// 机器人人设多语言配置
export interface FieldLabels {
  zh: string;
  vi: string;
}

export const BOT_PERSONALITY_LABELS: Record<string, FieldLabels> = {
  // Basic Information 基础信息
  bot_name: {
    zh: '姓名',
    vi: 'Họ tên'
  },
  nationality: {
    zh: '国籍',
    vi: 'Quốc tịch'
  },
  age: {
    zh: '年龄',
    vi: 'Tuổi'
  },
  gender: {
    zh: '性别',
    vi: 'Giới tính'
  },
  height: {
    zh: '身高',
    vi: 'Chiều cao'
  },
  weight: {
    zh: '体重',
    vi: 'Cân nặng'
  },
  blood_type: {
    zh: '血型',
    vi: 'Nhóm máu'
  },
  zodiac_sign: {
    zh: '星座',
    vi: 'Cung hoàng đạo'
  },
  birth_date: {
    zh: '出生日期',
    vi: 'Ngày sinh'
  },
  birth_place: {
    zh: '出生地',
    vi: 'Nơi sinh'
  },
  current_address: {
    zh: '现居地址/附近地点/附近交通',
    vi: 'Địa chỉ hiện tại / Địa điểm gần đó / Phương tiện giao thông gần đó'
  },
  current_job: {
    zh: '现在的工作',
    vi: 'Công việc hiện tại'
  },
  work_address: {
    zh: '工作地址/附近地点/附近交通',
    vi: 'Địa chỉ làm việc / Địa điểm gần đó / Phương tiện giao thông gần đó'
  },
  
  // Lifestyle 作息和生活习惯
  daily_routine: {
    zh: '作息框架:起床/早餐/午餐/晚餐/工作时间/休假时间/假期的安排',
    vi: 'Thói quen sinh hoạt: Thức dậy / Ăn sáng / Ăn trưa / Ăn tối / Giờ làm việc / Thời gian nghỉ ngơi / Sắp xếp kỳ nghỉ'
  },
  wake_up: {
    zh: '起床时间',
    vi: 'Thức dậy'
  },
  breakfast: {
    zh: '早餐时间',
    vi: 'Ăn sáng'
  },
  lunch: {
    zh: '午餐时间',
    vi: 'Ăn trưa'
  },
  dinner: {
    zh: '晚餐时间',
    vi: 'Ăn tối'
  },
  work_hours: {
    zh: '工作时间',
    vi: 'Giờ làm việc'
  },
  rest_time: {
    zh: '休假时间',
    vi: 'Thời gian nghỉ ngơi'
  },
  vacation: {
    zh: '假期安排',
    vi: 'Sắp xếp kỳ nghỉ'
  },
  
  // Preferences 喜好
  favorite_music: {
    zh: '喜欢的音乐',
    vi: 'Âm nhạc yêu thích'
  },
  favorite_movies: {
    zh: '喜欢的电影',
    vi: 'Phim ảnh yêu thích'
  },
  favorite_fashion: {
    zh: '喜欢的穿着',
    vi: 'Phong cách ăn mặc yêu thích'
  },
  favorite_hairstyle: {
    zh: '喜欢的发型',
    vi: 'Kiểu tóc yêu thích'
  },
  favorite_food: {
    zh: '喜欢的美食',
    vi: 'Ẩm thực yêu thích'
  },
  favorite_restaurants: {
    zh: '喜欢的餐厅',
    vi: 'Nhà hàng yêu thích'
  },
  
  // Education 教育背景
  education_level: {
    zh: '学历',
    vi: 'Trình độ học vấn'
  },
  graduate_school: {
    zh: '毕业院校',
    vi: 'Trường tốt nghiệp'
  },
  major: {
    zh: '专业',
    vi: 'Chuyên ngành'
  },
  
  // Marriage 婚姻状况
  marital_status: {
    zh: '婚姻状况',
    vi: 'Tình trạng hôn nhân'
  },
  marriage_history: {
    zh: '婚姻经历',
    vi: 'Kinh nghiệm hôn nhân'
  },
  
  // Background 背景 (保留旧字段以兼容)
  education_background: {
    zh: '教育背景',
    vi: 'Trình độ học vấn'
  },
  
  // Interests and Values 兴趣和价值观
  hobbies: {
    zh: '兴趣爱好',
    vi: 'Sở thích cá nhân'
  },
  worldview: {
    zh: '世界观',
    vi: 'Thế giới quan'
  },
  life_philosophy: {
    zh: '人生观',
    vi: 'Nhân sinh quan'
  },
  values: {
    zh: '价值观',
    vi: 'Giá trị quan'
  },
  
  // Life Timeline and Family 人生时间轴和家庭
  life_timeline: {
    zh: '人生时间轴',
    vi: 'Dòng thời gian cuộc đời'
  },
  family_members: {
    zh: '家庭成员:关系/名字/描述',
    vi: 'Thành viên gia đình: Mối quan hệ / Tên / Mô tả'
  },
  
  // Life Experiences 人生经历
  childhood_experience: {
    zh: '童年经历',
    vi: 'Trải nghiệm thời thơ ấu'
  },
  childhood_stories: {
    zh: '童年故事',
    vi: 'Câu chuyện thời thơ ấu'
  },
  growth_experience: {
    zh: '成长经历',
    vi: 'Quá trình trưởng thành'
  },
  relationship_experience: {
    zh: '感情经历',
    vi: 'Kinh nghiệm tình cảm'
  },
  work_experience: {
    zh: '工作经历',
    vi: 'Kinh nghiệm làm việc'
  },
  business_experience: {
    zh: '创业经历',
    vi: 'Kinh nghiệm khởi nghiệp'
  },
  investment_experience: {
    zh: '投资经历',
    vi: 'Kinh nghiệm đầu tư'
  },
  
  // Dreams and Future 梦想和未来
  places_to_visit: {
    zh: '想去的地方',
    vi: 'Những nơi muốn đến'
  },
  life_dreams: {
    zh: '人生梦想',
    vi: 'Ước mơ cuộc đời'
  },
  future_thoughts: {
    zh: '对未来人生的想法',
    vi: 'Suy nghĩ về cuộc sống tương lai'
  }
};

// 图片类型标签
export const IMAGE_TYPE_LABELS: Record<string, FieldLabels> = {
  personal: {
    zh: '个人照片',
    vi: 'Ảnh cá nhân'
  },
  lifestyle: {
    zh: '生活照片',
    vi: 'Ảnh cuộc sống'
  },
  work: {
    zh: '工作照片',
    vi: 'Ảnh công việc'
  },
  hobby: {
    zh: '兴趣爱好照片',
    vi: 'Ảnh sở thích'
  },
  travel: {
    zh: '旅游照片',
    vi: 'Ảnh du lịch'
  }
};

// 分类标签
export const CATEGORY_LABELS: Record<string, FieldLabels> = {
  basic_info: {
    zh: '基础信息',
    vi: 'Thông tin cơ bản'
  },
  lifestyle: {
    zh: '作息',
    vi: 'Lịch sinh hoạt'
  },
  preferences: {
    zh: '爱好',
    vi: 'Sở thích'
  },
  values: {
    zh: '价值观',
    vi: 'Giá trị'
  },
  experiences: {
    zh: '人生经历',
    vi: 'Kinh nghiệm sống'
  },
  dreams: {
    zh: '未来',
    vi: 'Tương lai'
  },
  images: {
    zh: '照片管理',
    vi: 'Quản lý ảnh'
  }
};

// 通用标签
export const COMMON_LABELS: Record<string, FieldLabels> = {
  save: {
    zh: '保存',
    vi: 'Lưu'
  },
  cancel: {
    zh: '取消',
    vi: 'Hủy'
  },
  edit: {
    zh: '编辑',
    vi: 'Chỉnh sửa'
  },
  delete: {
    zh: '删除',
    vi: 'Xóa'
  },
  upload: {
    zh: '上传',
    vi: 'Tải lên'
  },
  preview: {
    zh: '预览',
    vi: 'Xem trước'
  },
  add: {
    zh: '添加',
    vi: 'Thêm'
  },
  required: {
    zh: '必填',
    vi: 'Bắt buộc'
  },
  optional: {
    zh: '可选',
    vi: 'Tùy chọn'
  },
  enter: {
    zh: '输入',
    vi: 'Nhập'
  },
  select: {
    zh: '选择',
    vi: 'Chọn'
  }
};

// 语言选择器
export type Language = 'zh' | 'vi';

export const getLabel = (key: string, lang: Language = 'zh'): string => {
  const labels = BOT_PERSONALITY_LABELS[key] || IMAGE_TYPE_LABELS[key] || CATEGORY_LABELS[key] || COMMON_LABELS[key];
  return labels?.[lang] || key;
}; 