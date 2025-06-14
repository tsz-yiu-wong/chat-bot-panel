const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取Supabase配置
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置，请检查.env.local文件');
  console.error('需要设置: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 读取CSV文件并解析数据
 */
async function readCSVFile(filePath) {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // 只取需要的字段，忽略空行
        if (data['大标题_cn'] && data['话题']) {
          results.push({
            categoryNameCn: data['大标题_cn'].trim(),
            categoryNameVn: data['大标题_vi'].trim(),
            subcategoryNameCn: data['小标题_cn'].trim(),
            subcategoryNameVn: data['小标题_vi'].trim(),
            topicContent: data['话题'].trim()
          });
        }
      })
      .on('end', () => {
        console.log(`成功读取 ${results.length} 条记录`);
        resolve(results);
      })
      .on('error', reject);
  });
}

/**
 * 获取或创建话题大类
 */
async function getOrCreateCategory(nameCn, nameVn) {
  try {
    // 先查找是否存在
    const { data: existing, error: selectError } = await supabase
      .from('topic_categories')
      .select('id')
      .eq('name_cn', nameCn)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }
    
    if (existing) {
      return existing.id;
    }
    
    // 获取当前最大排序值
    const { data: maxSort } = await supabase
      .from('topic_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const sortOrder = (maxSort?.sort_order || 999) + 1;
    
    // 不存在则创建
    const { data: inserted, error: insertError } = await supabase
      .from('topic_categories')
      .insert({
        name_cn: nameCn,
        name_vn: nameVn || nameCn,
        sort_order: sortOrder
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`创建新话题大类: ${nameCn} (${nameVn || nameCn})`);
    return inserted.id;
    
  } catch (error) {
    console.error(`创建话题大类失败: ${nameCn}`, error);
    throw error;
  }
}

/**
 * 获取或创建话题小类
 */
async function getOrCreateSubcategory(categoryId, nameCn, nameVn) {
  try {
    // 先查找是否存在
    const { data: existing, error: selectError } = await supabase
      .from('topic_subcategories')
      .select('id')
      .eq('category_id', categoryId)
      .eq('name_cn', nameCn)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }
    
    if (existing) {
      return existing.id;
    }
    
    // 获取当前最大排序值
    const { data: maxSort } = await supabase
      .from('topic_subcategories')
      .select('sort_order')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const sortOrder = (maxSort?.sort_order || 999) + 1;
    
    // 不存在则创建
    const { data: inserted, error: insertError } = await supabase
      .from('topic_subcategories')
      .insert({
        category_id: categoryId,
        name_cn: nameCn,
        name_vn: nameVn || nameCn,
        sort_order: sortOrder
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`创建新话题小类: ${nameCn} (${nameVn || nameCn})`);
    return inserted.id;
    
  } catch (error) {
    console.error(`创建话题小类失败: ${nameCn}`, error);
    throw error;
  }
}

/**
 * 创建话题
 */
async function createTopic(categoryId, subcategoryId, content) {
  try {
    // 检查是否已存在相同内容的话题
    const { data: existing, error: selectError } = await supabase
      .from('topics')
      .select('id')
      .eq('subcategory_id', subcategoryId)
      .eq('content', content)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }
    
    if (existing) {
      console.log(`话题已存在，跳过: ${content.substring(0, 50)}...`);
      return existing.id;
    }
    
    // 获取当前最大排序值
    const { data: maxSort } = await supabase
      .from('topics')
      .select('sort_order')
      .eq('subcategory_id', subcategoryId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const sortOrder = (maxSort?.sort_order || 999) + 1;
    
    // 创建新话题
    const { data: inserted, error: insertError } = await supabase
      .from('topics')
      .insert({
        category_id: categoryId,
        subcategory_id: subcategoryId,
        content: content,
        usage_count: 0,
        sort_order: sortOrder
      })
      .select('id')
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    return inserted.id;
    
  } catch (error) {
    console.error(`创建话题失败: ${content.substring(0, 50)}...`, error);
    throw error;
  }
}

/**
 * 批量导入话题数据
 */
async function importTopicsData(csvData) {
  try {
    let importedCount = 0;
    let skippedCount = 0;
    const categoryMap = new Map();
    const subcategoryMap = new Map();
    
    console.log('开始导入话题数据...');
    
    for (const row of csvData) {
      try {
        const { categoryNameCn, categoryNameVn, subcategoryNameCn, subcategoryNameVn, topicContent } = row;
        
        // 跳过无效数据
        if (!categoryNameCn || !topicContent) {
          skippedCount++;
          continue;
        }
        
        // 获取或创建大类
        const categoryKey = categoryNameCn;
        let categoryId = categoryMap.get(categoryKey);
        if (!categoryId) {
          categoryId = await getOrCreateCategory(categoryNameCn, categoryNameVn || categoryNameCn);
          categoryMap.set(categoryKey, categoryId);
        }
        
        // 获取或创建小类
        const subcategoryKey = `${categoryKey}_${subcategoryNameCn}`;
        let subcategoryId = subcategoryMap.get(subcategoryKey);
        if (!subcategoryId) {
          subcategoryId = await getOrCreateSubcategory(
            categoryId, 
            subcategoryNameCn || '默认小类', 
            subcategoryNameVn || subcategoryNameCn || '默认小类'
          );
          subcategoryMap.set(subcategoryKey, subcategoryId);
        }
        
        // 创建话题
        await createTopic(categoryId, subcategoryId, topicContent);
        importedCount++;
        
        // 每100条记录输出一次进度
        if (importedCount % 100 === 0) {
          console.log(`已导入 ${importedCount} 条话题...`);
        }
        
      } catch (rowError) {
        console.error(`处理行数据失败:`, row, rowError);
        skippedCount++;
      }
    }
    
    console.log('\n=== 导入完成 ===');
    console.log(`成功导入: ${importedCount} 条话题`);
    console.log(`跳过记录: ${skippedCount} 条`);
    console.log(`大类数量: ${categoryMap.size} 个`);
    console.log(`小类数量: ${subcategoryMap.size} 个`);
    
  } catch (error) {
    console.error('导入过程中发生错误:', error);
    throw error;
  }
}

/**
 * 清空现有话题数据
 */
async function clearExistingTopics() {
  try {
    console.log('清空现有话题数据...');
    
    // 按依赖关系顺序删除
    const { error: topicsError } = await supabase
      .from('topics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录
    
    if (topicsError) {
      throw topicsError;
    }
    
    const { error: subcategoriesError } = await supabase
      .from('topic_subcategories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录
    
    if (subcategoriesError) {
      throw subcategoriesError;
    }
    
    const { error: categoriesError } = await supabase
      .from('topic_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录
    
    if (categoriesError) {
      throw categoriesError;
    }
    
    console.log('现有数据清空完成');
    
  } catch (error) {
    console.error('清空数据失败:', error);
    throw error;
  }
}

/**
 * 显示导入统计信息
 */
async function showImportStats() {
  try {
    const { data: categoryData, error: categoryError } = await supabase
      .from('topic_categories')
      .select('count');
    
    const { data: subcategoryData, error: subcategoryError } = await supabase
      .from('topic_subcategories')
      .select('count');
    
    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('count');
    
    if (categoryError || subcategoryError || topicError) {
      throw categoryError || subcategoryError || topicError;
    }
    
    // 使用RPC函数获取准确的计数
    const { data: categoryCount } = await supabase.rpc('get_topic_categories_count');
    const { data: subcategoryCount } = await supabase.rpc('get_topic_subcategories_count');
    const { data: topicCount } = await supabase.rpc('get_topics_count');
    
    console.log('\n=== 数据库统计 ===');
    console.log(`话题大类: ${categoryCount || 0} 个`);
    console.log(`话题小类: ${subcategoryCount || 0} 个`);
    console.log(`话题总数: ${topicCount || 0} 条`);
    
    // 显示前5个大类
    const { data: sampleCategories, error: sampleError } = await supabase
      .from('topic_categories')
      .select(`
        name_cn, 
        name_vn,
        topic_subcategories(count),
        topics(count)
      `)
      .order('sort_order')
      .limit(5);
    
    if (!sampleError && sampleCategories) {
      console.log('\n前5个话题大类:');
      sampleCategories.forEach(cat => {
        const subcategoryCount = cat.topic_subcategories?.length || 0;
        const topicCount = cat.topics?.length || 0;
        console.log(`- ${cat.name_cn} (${cat.name_vn}) - ${subcategoryCount}个小类, ${topicCount}个话题`);
      });
    }
    
  } catch (error) {
    console.error('获取统计信息失败:', error);
    
    // 备用方案：简单计数
    try {
      const { count: categoryCount } = await supabase
        .from('topic_categories')
        .select('*', { count: 'exact', head: true });
      
      const { count: subcategoryCount } = await supabase
        .from('topic_subcategories')
        .select('*', { count: 'exact', head: true });
      
      const { count: topicCount } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true });
      
      console.log('\n=== 数据库统计 ===');
      console.log(`话题大类: ${categoryCount || 0} 个`);
      console.log(`话题小类: ${subcategoryCount || 0} 个`);
      console.log(`话题总数: ${topicCount || 0} 条`);
      
    } catch (backupError) {
      console.error('备用统计方案也失败:', backupError);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const csvFilePath = path.join(__dirname, '话题库1.csv');
    
    // 检查CSV文件是否存在
    if (!fs.existsSync(csvFilePath)) {
      console.error(`CSV文件不存在: ${csvFilePath}`);
      process.exit(1);
    }
    
    console.log('=== 话术库导入工具 ===');
    console.log(`CSV文件路径: ${csvFilePath}`);
    console.log(`Supabase URL: ${supabaseUrl}`);
    
    // 测试Supabase连接
    const { data, error } = await supabase
      .from('topic_categories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase连接失败:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Supabase连接成功');
    
    // 询问是否清空现有数据
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    
    if (shouldClear) {
      await clearExistingTopics();
    }
    
    // 读取CSV数据
    console.log('\n正在读取CSV文件...');
    const csvData = await readCSVFile(csvFilePath);
    
    if (csvData.length === 0) {
      console.log('CSV文件中没有有效数据');
      return;
    }
    
    // 导入数据
    await importTopicsData(csvData);
    
    // 显示统计信息
    await showImportStats();
    
    console.log('\n话术库导入完成！');
    
  } catch (error) {
    console.error('导入失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  importTopicsData,
  clearExistingTopics,
  showImportStats
}; 