const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');

// 从环境变量读取Supabase配置
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置，请检查.env.local文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV文件路径
const csvFilePath = path.join(__dirname, '缩写.csv');

// 调用OpenAI API生成向量
async function generateEmbedding(text) {
  if (!openaiApiKey) {
    console.log('⚠️  缺少OpenAI API密钥，跳过向量生成');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('❌ 生成向量失败:', error.message);
    return null;
  }
}

// 更新向量数据库中的embedding
async function updateVectorEmbeddings(documentId) {
  try {
    // 获取该文档的所有向量记录
    const { data: vectors, error: fetchError } = await supabase
      .from('knowledge_vectors')
      .select('*')
      .eq('document_id', documentId)
      .eq('document_type', 'abbreviation');

    if (fetchError) {
      console.error('❌ 获取向量记录失败:', fetchError.message);
      return false;
    }

    if (!vectors || vectors.length === 0) {
      console.log('⚠️  未找到向量记录');
      return false;
    }

    let updateCount = 0;

    // 为每个向量记录生成并更新embedding
    for (const vector of vectors) {
      const embedding = await generateEmbedding(vector.content);
      
      if (embedding) {
        const { error: updateError } = await supabase
          .from('knowledge_vectors')
          .update({ 
            embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
            updated_at: new Date().toISOString()
          })
          .eq('id', vector.id);

        if (updateError) {
          console.error(`❌ 更新向量${vector.id}失败:`, updateError.message);
        } else {
          updateCount++;
          console.log(`📝 已更新向量: ${vector.vector_type} (${vector.id.substring(0, 8)}...)`);
        }
      }

      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ 向量更新完成: ${updateCount}/${vectors.length} 条记录`);
    return updateCount > 0;

  } catch (error) {
    console.error('❌ 更新向量embedding失败:', error.message);
    return false;
  }
}

// 智能分类函数
function categorizeAbbreviation(abbreviation, fullForm, chineseDesc, vietnameseDesc) {
  // 根据内容智能判断分类
  const content = `${abbreviation} ${fullForm} ${chineseDesc} ${vietnameseDesc}`.toLowerCase();
  
  // 人称代词
  if (/\b(我|你|他|她|tôi|bạn|anh|em|chị|mình|mày)\b/.test(content)) {
    return '人称代词（Đại từ nhân xưng）';
  }
  
  // 时间相关
  if (/\b(时间|今天|明天|昨天|thời gian|hôm nay|hôm qua|ngày mai)\b/.test(content)) {
    return '时间表达（Biểu hiện thời gian）';
  }
  
  // 商务相关
  if (/\b(公司|经理|商贸|工作|giám đốc|công ty|thương mại|công việc)\b/.test(content)) {
    return '商务用语（Thuật ngữ thương mại）';
  }
  
  // 感情相关
  if (/\b(爱人|男朋友|女朋友|老公|老婆|người yêu|chồng|vợ|chia tay)\b/.test(content)) {
    return '感情关系（Mối quan hệ tình cảm）';
  }
  
  // 网络用语
  if (/\b(聊天|发信息|facebook|zalo|inbox|nhắn tin|nói chuyện)\b/.test(content)) {
    return '网络社交（Mạng xã hội）';
  }
  
  // 地理位置
  if (/\b(越南|中国|城市|Việt Nam|Trung Quốc|thành phố)\b/.test(content)) {
    return '地理位置（Vị trí địa lý）';
  }
  
  // 数量金额
  if (/\b(多少|千|百万|bao nhiêu|nghìn|triệu)\b/.test(content)) {
    return '数量金额（Số lượng và số tiền）';
  }
  
  // 日常用语
  if (/\b(喝|吃|睡|做什么|uống|ăn|ngủ|làm gì)\b/.test(content)) {
    return '日常用语（Ngôn ngữ hàng ngày）';
  }
  
  // 默认分类
  return '常用缩写（Từ viết tắt thông dụng）';
}

// 生成优先级
function generatePriority(abbreviation, fullForm, chineseDesc) {
  // 根据使用频率和重要性设置优先级 (1-10)
  const content = `${abbreviation} ${fullForm} ${chineseDesc}`.toLowerCase();
  
  // 高优先级：基础人称代词
  if (/\b(我|你|他|她|tôi|bạn|anh|em)\b/.test(content)) {
    return 9;
  }
  
  // 高优先级：常用时间
  if (/\b(今天|明天|现在|hôm nay|bây giờ)\b/.test(content)) {
    return 8;
  }
  
  // 中高优先级：常用动词
  if (/\b(是|可以|知道|喜欢|được|biết|thích)\b/.test(content)) {
    return 7;
  }
  
  // 中等优先级：感情和社交
  if (/\b(爱人|聊天|người yêu|nói chuyện)\b/.test(content)) {
    return 6;
  }
  
  // 中等优先级：商务用语
  if (/\b(公司|工作|công ty|công việc)\b/.test(content)) {
    return 5;
  }
  
  // 较低优先级：网络用语
  if (/\b(facebook|zalo|admin)\b/.test(content)) {
    return 4;
  }
  
  // 默认优先级
  return 3;
}

// 存储文档向量的函数
async function storeDocumentVector(documentId, content, metadata) {
  try {
    console.log(`🔄 开始处理向量数据: ${documentId.substring(0, 8)}...`);
    
    // 由于数据库触发器已自动创建向量记录，我们只需要更新embedding
    const success = await updateVectorEmbeddings(documentId);
    
    if (success) {
      console.log(`✅ 向量数据处理完成: ${documentId.substring(0, 8)}...`);
    } else {
      console.log(`⚠️  向量数据处理失败: ${documentId.substring(0, 8)}...`);
    }
    
    return success;
  } catch (error) {
    console.error('❌ 向量存储失败:', error.message);
    return false;
  }
}

// 批量向量化所有无embedding的记录
async function vectorizeAllPendingRecords() {
  if (!openaiApiKey) {
    console.log('⚠️  缺少OpenAI API密钥，跳过向量化');
    return;
  }

  console.log('🔄 检查待向量化的记录...');

  try {
    // 获取所有没有embedding的向量记录
    const { data: pendingVectors, error } = await supabase
      .from('knowledge_vectors')
      .select('id, content, vector_type')
      .eq('document_type', 'abbreviation')
      .is('embedding', null);

    if (error) {
      console.error('❌ 获取待向量化记录失败:', error.message);
      return;
    }

    if (!pendingVectors || pendingVectors.length === 0) {
      console.log('✅ 所有向量记录都已有embedding');
      return;
    }

    console.log(`📊 找到 ${pendingVectors.length} 条待向量化记录`);

    let processedCount = 0;
    for (const vector of pendingVectors) {
      const embedding = await generateEmbedding(vector.content);
      
      if (embedding) {
        const { error: updateError } = await supabase
          .from('knowledge_vectors')
          .update({ 
            embedding: `[${embedding.join(',')}]`,
            updated_at: new Date().toISOString()
          })
          .eq('id', vector.id);

        if (updateError) {
          console.error(`❌ 更新向量失败:`, updateError.message);
        } else {
          processedCount++;
          console.log(`✅ 已处理: ${vector.vector_type} (${processedCount}/${pendingVectors.length})`);
        }
      }

      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`🎉 批量向量化完成: ${processedCount}/${pendingVectors.length} 条记录`);

  } catch (error) {
    console.error('❌ 批量向量化失败:', error.message);
  }
}

// 主导入函数
async function importAbbreviations() {
  console.log('🚀 开始导入缩写数据...');
  
  // 检查CSV文件是否存在
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV文件不存在: ${csvFilePath}`);
    process.exit(1);
  }

  const abbreviations = [];
  let lineNumber = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        
        // 跳过标题行和空行
        if (lineNumber === 1 || !row['缩写'] || !row['全写']) {
          return;
        }

        const abbreviation = row['缩写'].trim();
        const fullForm = row['全写'].trim();
        const chineseDesc = row['描述（中文）'] ? row['描述（中文）'].trim() : '';
        const vietnameseDesc = row['描述（Tiếng Việt）'] ? row['描述（Tiếng Việt）'].trim() : '';
        
        // 智能分类
        const category = categorizeAbbreviation(abbreviation, fullForm, chineseDesc, vietnameseDesc);
        
        // 生成优先级
        const priority = generatePriority(abbreviation, fullForm, chineseDesc);
        
        // 合并描述
        let description = '';
        if (chineseDesc && vietnameseDesc) {
          description = `${chineseDesc} | ${vietnameseDesc}`;
        } else if (chineseDesc) {
          description = chineseDesc;
        } else if (vietnameseDesc) {
          description = vietnameseDesc;
        }

        if (abbreviation && fullForm) {
          abbreviations.push({
            category,
            abbreviation,
            full_form: fullForm,
            description: description || null,
            priority,
            usage_context: '日常交流'
          });
        }
      })
      .on('end', async () => {
        console.log(`📊 解析完成，共找到 ${abbreviations.length} 条缩写`);
        
        try {
          // 批量插入数据
          let successCount = 0;
          let errorCount = 0;
          
          for (const abbr of abbreviations) {
            try {
              const { data, error } = await supabase
                .from('knowledge_abbreviations')
                .insert([abbr])
                .select();

              if (error) {
                console.error(`❌ 插入失败:`, error.message);
                errorCount++;
                continue;
              }

              if (data && data[0]) {
                // 异步生成和存储向量
                await storeDocumentVector(
                  data[0].id,
                  `${abbr.abbreviation} - ${abbr.full_form} - ${abbr.description || ''}`,
                  {
                    category: abbr.category,
                    abbreviation: abbr.abbreviation,
                    full_form: abbr.full_form,
                    type: 'abbreviation'
                  }
                );
                
                successCount++;
                console.log(`✅ 成功导入: ${abbr.abbreviation} → ${abbr.full_form} [${abbr.category}] (${successCount}/${abbreviations.length})`);
              }
            } catch (err) {
              console.error(`❌ 处理失败:`, err.message);
              errorCount++;
            }
          }
          
          console.log('\n📈 导入完成统计:');
          console.log(`✅ 成功: ${successCount} 条`);
          console.log(`❌ 失败: ${errorCount} 条`);
          console.log(`📊 总计: ${abbreviations.length} 条`);
          
          resolve();
        } catch (error) {
          console.error('❌ 导入过程中发生错误:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('❌ 读取CSV文件失败:', error);
        reject(error);
      });
  });
}

// 清理现有数据的函数（可选）
async function clearExistingAbbreviations() {
  console.log('🧹 清理现有缩写数据...');
  
  try {
    // 删除向量数据
    const { error: vectorError } = await supabase
      .from('knowledge_vectors')
      .delete()
      .eq('document_type', 'abbreviation');
    
    if (vectorError) {
      console.error('清理向量数据失败:', vectorError);
    }
    
    // 删除缩写数据
    const { error: abbrError } = await supabase
      .from('knowledge_abbreviations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录
    
    if (abbrError) {
      console.error('清理缩写数据失败:', abbrError);
    } else {
      console.log('✅ 现有数据清理完成');
    }
  } catch (error) {
    console.error('❌ 清理数据时发生错误:', error);
  }
}

// 显示分类统计
async function showCategoryStats() {
  try {
    const { data: abbreviations, error } = await supabase
      .from('knowledge_abbreviations')
      .select('category');

    if (error) throw error;

    const categoryStats = {};
    abbreviations.forEach(abbr => {
      categoryStats[abbr.category] = (categoryStats[abbr.category] || 0) + 1;
    });

    console.log('\n📊 分类统计:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count} 条`);
      });

  } catch (error) {
    console.error('❌ 获取统计数据失败:', error);
  }
}

// 主执行函数
async function main() {
  try {
    console.log('🎯 缩写数据导入工具');
    console.log('=====================================');
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const vectorizeOnly = args.includes('--vectorize-only');
    const showStats = args.includes('--stats');
    
    // 如果只是显示统计
    if (showStats) {
      await showCategoryStats();
      return;
    }
    
    // 如果只是向量化现有数据
    if (vectorizeOnly) {
      console.log('🔄 仅向量化现有数据模式');
      await vectorizeAllPendingRecords();
      console.log('\n🎉 向量化任务完成！');
      return;
    }
    
    if (shouldClear) {
      await clearExistingAbbreviations();
      console.log('');
    }
    
    await importAbbreviations();
    
    // 导入完成后，批量向量化所有待处理的记录
    console.log('\n🔄 开始批量向量化...');
    await vectorizeAllPendingRecords();
    
    // 显示分类统计
    await showCategoryStats();
    
    console.log('\n🎉 导入任务完成！');
    if (openaiApiKey) {
      console.log('✅ 向量索引已生成');
    } else {
      console.log('💡 提示: 如果需要生成向量索引，请配置OpenAI API密钥并运行: node import-abbreviations.js --vectorize-only');
    }
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { importAbbreviations, clearExistingAbbreviations }; 