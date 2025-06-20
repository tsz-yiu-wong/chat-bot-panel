// 测试多语言向量化功能
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMultilingualVectorization() {
  try {
    console.log('🧪 开始测试多语言向量化功能...\n');

    // 1. 获取一个现有的机器人
    const { data: bots, error: fetchError } = await supabase
      .from('bot_personalities')
      .select('*')
      .limit(1);

    if (fetchError || !bots || bots.length === 0) {
      console.error('❌ 无法获取机器人数据:', fetchError);
      return;
    }

    const bot = bots[0];
    console.log(`📋 测试机器人: ${bot.bot_name} (ID: ${bot.id})`);

    // 2. 测试中文向量化
    console.log('\n🇨🇳 测试中文向量化...');
    const { error: zhError } = await supabase.rpc('create_bot_personality_vectors_with_language', {
      p_bot_id: bot.id,
      p_bot_name: bot.bot_name || '',
      p_nationality: bot.nationality || '',
      p_age: bot.age || null,
      p_gender: bot.gender || '',
      p_height: bot.height || '',
      p_weight: bot.weight || '',
      p_blood_type: bot.blood_type || '',
      p_zodiac_sign: bot.zodiac_sign || '',
      p_birth_date: bot.birth_date || '',
      p_birth_place: bot.birth_place || '',
      p_education_level: bot.education_level || '',
      p_graduate_school: bot.graduate_school || '',
      p_major: bot.major || '',
      p_current_address: bot.current_address || '',
      p_current_job: bot.current_job || '',
      p_work_address: bot.work_address || '',
      p_favorite_music: bot.favorite_music || '',
      p_favorite_movies: bot.favorite_movies || '',
      p_favorite_fashion: bot.favorite_fashion || '',
      p_favorite_hairstyle: bot.favorite_hairstyle || '',
      p_favorite_food: bot.favorite_food || '',
      p_favorite_restaurants: bot.favorite_restaurants || '',
      p_hobbies: bot.hobbies || '',
      p_worldview: bot.worldview || '',
      p_life_philosophy: bot.life_philosophy || '',
      p_values: bot.values || '',
      p_childhood_experience: bot.childhood_experience || '',
      p_childhood_stories: bot.childhood_stories || '',
      p_growth_experience: bot.growth_experience || '',
      p_relationship_experience: bot.relationship_experience || '',
      p_marital_status: bot.marital_status || '',
      p_marriage_history: bot.marriage_history || '',
      p_work_experience: bot.work_experience || '',
      p_business_experience: bot.business_experience || '',
      p_investment_experience: bot.investment_experience || '',
      p_places_to_visit: bot.places_to_visit || '',
      p_life_dreams: bot.life_dreams || '',
      p_future_thoughts: bot.future_thoughts || '',
      p_language: 'zh'
    });

    if (zhError) {
      console.error('❌ 中文向量化失败:', zhError);
      return;
    }

    // 查看中文向量内容
    const { data: zhVectors, error: zhFetchError } = await supabase
      .from('bot_vectors')
      .select('vector_type, content, metadata')
      .eq('bot_id', bot.id)
      .eq('is_deleted', false);

    if (zhFetchError) {
      console.error('❌ 获取中文向量失败:', zhFetchError);
      return;
    }

    console.log('✅ 中文向量化成功！生成向量数量:', zhVectors.length);
    zhVectors.forEach(vector => {
      console.log(`  📝 ${vector.vector_type}: ${vector.content.substring(0, 100)}...`);
    });

    // 3. 测试越南文向量化
    console.log('\n🇻🇳 测试越南文向量化...');
    const { error: viError } = await supabase.rpc('create_bot_personality_vectors_with_language', {
      p_bot_id: bot.id,
      p_bot_name: bot.bot_name || '',
      p_nationality: bot.nationality || '',
      p_age: bot.age || null,
      p_gender: bot.gender || '',
      p_height: bot.height || '',
      p_weight: bot.weight || '',
      p_blood_type: bot.blood_type || '',
      p_zodiac_sign: bot.zodiac_sign || '',
      p_birth_date: bot.birth_date || '',
      p_birth_place: bot.birth_place || '',
      p_education_level: bot.education_level || '',
      p_graduate_school: bot.graduate_school || '',
      p_major: bot.major || '',
      p_current_address: bot.current_address || '',
      p_current_job: bot.current_job || '',
      p_work_address: bot.work_address || '',
      p_favorite_music: bot.favorite_music || '',
      p_favorite_movies: bot.favorite_movies || '',
      p_favorite_fashion: bot.favorite_fashion || '',
      p_favorite_hairstyle: bot.favorite_hairstyle || '',
      p_favorite_food: bot.favorite_food || '',
      p_favorite_restaurants: bot.favorite_restaurants || '',
      p_hobbies: bot.hobbies || '',
      p_worldview: bot.worldview || '',
      p_life_philosophy: bot.life_philosophy || '',
      p_values: bot.values || '',
      p_childhood_experience: bot.childhood_experience || '',
      p_childhood_stories: bot.childhood_stories || '',
      p_growth_experience: bot.growth_experience || '',
      p_relationship_experience: bot.relationship_experience || '',
      p_marital_status: bot.marital_status || '',
      p_marriage_history: bot.marriage_history || '',
      p_work_experience: bot.work_experience || '',
      p_business_experience: bot.business_experience || '',
      p_investment_experience: bot.investment_experience || '',
      p_places_to_visit: bot.places_to_visit || '',
      p_life_dreams: bot.life_dreams || '',
      p_future_thoughts: bot.future_thoughts || '',
      p_language: 'vi'
    });

    if (viError) {
      console.error('❌ 越南文向量化失败:', viError);
      return;
    }

    // 查看越南文向量内容
    const { data: viVectors, error: viFetchError } = await supabase
      .from('bot_vectors')
      .select('vector_type, content, metadata')
      .eq('bot_id', bot.id)
      .eq('is_deleted', false);

    if (viFetchError) {
      console.error('❌ 获取越南文向量失败:', viFetchError);
      return;
    }

    console.log('✅ 越南文向量化成功！生成向量数量:', viVectors.length);
    viVectors.forEach(vector => {
      console.log(`  📝 ${vector.vector_type}: ${vector.content.substring(0, 100)}...`);
    });

    // 4. 对比格式变化
    console.log('\n🔍 对比Content格式变化:');
    console.log('注意每个字段都有：');
    console.log('  1. 对应语言的标签');
    console.log('  2. 句号结尾');
    console.log('  3. 按表单顺序排列');

    // 显示基础信息向量的详细对比
    const zhBasicInfo = zhVectors.find(v => v.vector_type === 'basic_info');
    const viBasicInfo = viVectors.find(v => v.vector_type === 'basic_info');

    console.log('\n📊 基础信息向量对比:');
    console.log('🇨🇳 中文版本:');
    console.log(`   ${zhBasicInfo?.content || '无内容'}`);
    console.log('🇻🇳 越南文版本:');
    console.log(`   ${viBasicInfo?.content || '无内容'}`);

    console.log('\n✨ 测试完成！多语言向量化功能正常工作。');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testMultilingualVectorization().then(() => {
  console.log('\n🎉 测试结束');
  process.exit(0);
}); 