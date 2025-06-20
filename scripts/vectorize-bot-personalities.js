#!/usr/bin/env node

/**
 * 机器人人设向量化脚本
 * 为现有的机器人人设数据生成向量索引
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 生成向量
async function generateEmbedding(text) {
  if (!openaiApiKey) {
    console.warn('⚠️  缺少OpenAI API密钥，跳过向量生成');
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
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('生成向量失败:', error.message);
    return null;
  }
}

// 调用数据库函数进行批量向量化
async function batchVectorizePersonalities() {
  try {
    console.log('🔄 开始批量向量化机器人人设...');
    
    // 调用数据库函数
    const { data: result, error } = await supabase.rpc('vectorize_existing_bot_personalities');
    
    if (error) {
      throw new Error(`数据库函数调用失败: ${error.message}`);
    }
    
    if (!result || result.length === 0) {
      console.log('📊 没有需要向量化的人设数据');
      return { processedCount: 0, totalCount: 0, embeddingCount: 0 };
    }
    
    const { processed_count, total_count } = result[0];
    console.log(`✅ 数据库向量化完成: ${processed_count}/${total_count} 个人设`);
    
    return { processedCount: processed_count, totalCount: total_count };
  } catch (error) {
    console.error('❌ 批量向量化失败:', error.message);
    throw error;
  }
}

// 为向量记录生成embedding
async function generateEmbeddingsForVectors() {
  if (!openaiApiKey) {
    console.log('⚠️  缺少OpenAI API密钥，跳过embedding生成');
    return 0;
  }

  try {
    console.log('🔄 获取待处理的向量记录...');
    
    // 获取所有没有embedding的向量记录
    const { data: pendingVectors, error } = await supabase
      .from('bot_vectors')
      .select('*')
      .is('embedding', null)
      .eq('is_deleted', false);

    if (error) {
      throw new Error(`获取向量记录失败: ${error.message}`);
    }

    if (!pendingVectors || pendingVectors.length === 0) {
      console.log('✅ 所有向量记录都已有embedding');
      return 0;
    }

    console.log(`📊 找到 ${pendingVectors.length} 条待处理记录`);

    let embeddingCount = 0;
    for (const vector of pendingVectors) {
      try {
        console.log(`🔄 处理向量: ${vector.vector_type} (${embeddingCount + 1}/${pendingVectors.length})`);
        
        const embedding = await generateEmbedding(vector.content);
        
        if (embedding) {
          const { error: updateError } = await supabase
            .from('bot_vectors')
            .update({ 
              embedding: `[${embedding.join(',')}]`,
              updated_at: new Date().toISOString()
            })
            .eq('id', vector.id);

          if (updateError) {
            console.error(`❌ 更新向量失败:`, updateError.message);
          } else {
            embeddingCount++;
            console.log(`✅ 已处理: ${vector.vector_type}`);
          }
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ 处理向量 ${vector.id} 失败:`, error.message);
      }
    }

    console.log(`🎉 Embedding生成完成: ${embeddingCount}/${pendingVectors.length} 条记录成功`);
    return embeddingCount;
  } catch (error) {
    console.error('❌ Embedding生成失败:', error.message);
    return 0;
  }
}

// 统计信息
async function getStatistics() {
  try {
    // 获取人设总数
    const { data: personalities, error: personalitiesError } = await supabase
      .from('bot_personalities')
      .select('id')
      .eq('is_deleted', false);

    if (personalitiesError) {
      throw new Error(`获取人设数据失败: ${personalitiesError.message}`);
    }

    // 获取向量总数
    const { data: vectors, error: vectorsError } = await supabase
      .from('bot_vectors')
      .select('id, embedding')
      .eq('is_deleted', false);

    if (vectorsError) {
      throw new Error(`获取向量数据失败: ${vectorsError.message}`);
    }

    const totalPersonalities = personalities?.length || 0;
    const totalVectors = vectors?.length || 0;
    const vectorsWithEmbedding = vectors?.filter(v => v.embedding).length || 0;

    console.log('\n📊 统计信息:');
    console.log(`   - 机器人人设总数: ${totalPersonalities}`);
    console.log(`   - 向量记录总数: ${totalVectors}`);
    console.log(`   - 已有embedding的向量: ${vectorsWithEmbedding}`);
    console.log(`   - 待处理的向量: ${totalVectors - vectorsWithEmbedding}`);

    return {
      totalPersonalities,
      totalVectors,
      vectorsWithEmbedding,
      pendingVectors: totalVectors - vectorsWithEmbedding
    };
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error.message);
    return null;
  }
}

// 主执行函数
async function main() {
  try {
    console.log('🎯 机器人人设向量化工具');
    console.log('=====================================');
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const embeddingOnly = args.includes('--embedding-only');
    const statsOnly = args.includes('--stats');
    
    // 如果只是查看统计信息
    if (statsOnly) {
      await getStatistics();
      return;
    }
    
    // 如果只是生成embedding
    if (embeddingOnly) {
      console.log('🔄 仅生成embedding模式');
      const embeddingCount = await generateEmbeddingsForVectors();
      console.log(`\n🎉 Embedding生成任务完成！成功处理 ${embeddingCount} 条记录`);
      return;
    }
    
    // 获取初始统计
    await getStatistics();
    
    // 执行批量向量化
    const { processedCount, totalCount } = await batchVectorizePersonalities();
    
    // 生成embedding
    const embeddingCount = await generateEmbeddingsForVectors();
    
    console.log('\n🎉 向量化任务完成！');
    console.log(`📊 处理结果:`);
    console.log(`   - 处理人设: ${processedCount}/${totalCount}`);
    console.log(`   - 生成embedding: ${embeddingCount} 个`);
    
    if (openaiApiKey) {
      console.log('✅ 向量索引已生成');
    } else {
      console.log('💡 提示: 如需生成embedding，请配置OpenAI API密钥并运行: node vectorize-bot-personalities.js --embedding-only');
    }
    
  } catch (error) {
    console.error('❌ 向量化失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
} 