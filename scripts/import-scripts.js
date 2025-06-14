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
const csvFilePath = path.join(__dirname, '话术知识库.csv');

// 场景映射 - 中文到越南文
const scenarioMapping = {
  '洗投资': 'Thuyết phục đầu tư',
  '包装自己': 'Giới thiệu bản thân',
  '包装创业经历': 'Chia sẻ kinh nghiệm khởi nghiệp',
  '洗赚钱': 'Thuyết phục kiếm tiền',
  '推迟/拒绝见面': 'Hoãn/Từ chối gặp mặt',
  '未婚人设': 'Độc thân',
  '包装自己慈善': 'Giới thiệu bản thân/Từ thiện',
  '点客户': 'Tiếp cận khách hàng',
  '加金投资': 'Tăng vốn đầu tư',
  '切客户': 'Chuyển đổi khách hàng',
  '其他': 'Khác'
};

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
      .eq('document_type', 'script');

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
            embedding: embedding,
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

// 生成向量内容的函数
function generateVectorContent(text, answer, scenario) {
  return `场景: ${scenario} | 用户: ${text} | 回答: ${answer}`;
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
      .eq('document_type', 'script')
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
        embedding: embedding,
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
async function importScripts() {
  console.log('🚀 开始导入话术数据...');
  
  // 检查CSV文件是否存在
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV文件不存在: ${csvFilePath}`);
    process.exit(1);
  }

  const scripts = [];
  let lineNumber = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        
        // 跳过标题行和空行
        if (lineNumber === 1 || !row['场景'] || !row['话术']) {
          return;
        }

        const chineseScenario = row['场景'].trim();
        const vietnameseText = row['话术'].trim();
        const correctedText = row['越南文修正'] ? row['越南文修正'].trim() : '';
        
        // 使用修正后的文本，如果没有修正则使用原文
        const finalText = correctedText || vietnameseText;
        
        // 获取越南文场景名称
        const vietnameseScenario = scenarioMapping[chineseScenario] || chineseScenario;
        
        // 创建双语场景名称 - 修改格式为：中文（越南文）
        const bilingualScenario = `${chineseScenario}（${vietnameseScenario}）`;

        if (finalText) {
          scripts.push({
            scenario: bilingualScenario,
            text: '客户咨询', // 由于CSV中没有明确的用户对话，使用通用描述
            answer: finalText,
            chinese_scenario: chineseScenario,
            vietnamese_scenario: vietnameseScenario
          });
        }
      })
      .on('end', async () => {
        console.log(`📊 解析完成，共找到 ${scripts.length} 条话术`);
        
        try {
          // 批量插入数据
          let successCount = 0;
          let errorCount = 0;
          
          for (const script of scripts) {
            try {
              const { data, error } = await supabase
                .from('knowledge_scripts')
                .insert([{
                  scenario: script.scenario,
                  text: script.text,
                  answer: script.answer
                }])
                .select();

              if (error) {
                console.error(`❌ 插入失败:`, error.message);
                errorCount++;
                continue;
              }

              if (data && data[0]) {
                // 异步生成和存储向量
                const vectorContent = generateVectorContent(script.text, script.answer, script.scenario);
                await storeDocumentVector(
                  data[0].id,
                  vectorContent,
                  {
                    scenario: script.scenario,
                    chinese_scenario: script.chinese_scenario,
                    vietnamese_scenario: script.vietnamese_scenario,
                    type: 'script'
                  }
                );
                
                successCount++;
                console.log(`✅ 成功导入: ${script.scenario} (${successCount}/${scripts.length})`);
              }
            } catch (err) {
              console.error(`❌ 处理失败:`, err.message);
              errorCount++;
            }
          }
          
          console.log('\n📈 导入完成统计:');
          console.log(`✅ 成功: ${successCount} 条`);
          console.log(`❌ 失败: ${errorCount} 条`);
          console.log(`📊 总计: ${scripts.length} 条`);
          
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
async function clearExistingScripts() {
  console.log('🧹 清理现有话术数据...');
  
  try {
    // 删除向量数据
    const { error: vectorError } = await supabase
      .from('knowledge_vectors')
      .delete()
      .eq('document_type', 'script');
    
    if (vectorError) {
      console.error('清理向量数据失败:', vectorError);
    }
    
    // 删除话术数据
    const { error: scriptError } = await supabase
      .from('knowledge_scripts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录
    
    if (scriptError) {
      console.error('清理话术数据失败:', scriptError);
    } else {
      console.log('✅ 现有数据清理完成');
    }
  } catch (error) {
    console.error('❌ 清理数据时发生错误:', error);
  }
}

// 主执行函数
async function main() {
  try {
    console.log('🎯 话术数据导入工具');
    console.log('=====================================');
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const vectorizeOnly = args.includes('--vectorize-only');
    
    // 如果只是向量化现有数据
    if (vectorizeOnly) {
      console.log('🔄 仅向量化现有数据模式');
      await vectorizeAllPendingRecords();
      console.log('\n🎉 向量化任务完成！');
      return;
    }
    
    if (shouldClear) {
      await clearExistingScripts();
      console.log('');
    }
    
    await importScripts();
    
    // 导入完成后，批量向量化所有待处理的记录
    console.log('\n🔄 开始批量向量化...');
    await vectorizeAllPendingRecords();
    
    console.log('\n🎉 导入任务完成！');
    if (openaiApiKey) {
      console.log('✅ 向量索引已生成');
    } else {
      console.log('💡 提示: 如果需要生成向量索引，请配置OpenAI API密钥并运行: node import-scripts.js --vectorize-only');
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

module.exports = { importScripts, clearExistingScripts }; 