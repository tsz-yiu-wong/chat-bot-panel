#!/usr/bin/env node

/**
 * 机器人人设向量搜索调试脚本
 * 用于调试向量搜索功能和相似度计算
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

// 计算余弦相似度
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

// 调试向量搜索
async function debugVectorSearch() {
  try {
    console.log('🔍 开始调试向量搜索...');
    
    // 测试查询
    const testQuery = "你有什么兴趣爱好";
    const threshold = 0.2;
    
    console.log(`\n📊 测试查询: "${testQuery}"`);
    console.log(`📊 相似度阈值: ${threshold}`);
    
    // 获取所有向量数据
    const { data: vectors, error } = await supabase
      .from('bot_vectors')
      .select('bot_id, vector_type, content, embedding, metadata')
      .eq('is_deleted', false)
      .not('embedding', 'is', null);

    if (error) {
      throw new Error(`获取向量数据失败: ${error.message}`);
    }

    console.log(`\n📊 找到 ${vectors?.length || 0} 个向量记录`);
    
    if (!vectors || vectors.length === 0) {
      console.log('❌ 没有找到向量数据');
      return;
    }

    // 展示向量内容
    console.log('\n📋 向量内容预览:');
    vectors.forEach((vector, index) => {
      console.log(`${index + 1}. [${vector.vector_type}] ${vector.content.substring(0, 100)}...`);
    });

    // 生成查询向量
    console.log(`\n🔄 为查询 "${testQuery}" 生成向量...`);
    const queryEmbedding = await generateEmbedding(testQuery);
    
    if (!queryEmbedding) {
      console.log('❌ 无法生成查询向量');
      return;
    }

    console.log(`✅ 查询向量生成成功，维度: ${queryEmbedding.length}`);

    // 计算相似度
    console.log('\n🎯 计算相似度:');
    const results = [];
    
    for (const vector of vectors) {
      try {
        let embedding;
        
        if (typeof vector.embedding === 'string') {
          try {
            embedding = JSON.parse(vector.embedding);
          } catch {
            console.log(`❌ 向量 ${vector.bot_id} 解析失败`);
            continue;
          }
        } else if (Array.isArray(vector.embedding)) {
          embedding = vector.embedding;
        } else {
          console.log(`❌ 向量 ${vector.bot_id} 格式错误`);
          continue;
        }

        if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
          console.log(`❌ 向量 ${vector.bot_id} 维度不匹配: ${embedding?.length} vs ${queryEmbedding.length}`);
          continue;
        }

        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        results.push({
          bot_id: vector.bot_id,
          bot_name: vector.metadata?.bot_name || '未知',
          vector_type: vector.vector_type,
          content: vector.content,
          similarity: similarity
        });

        console.log(`   [${vector.vector_type}] ${vector.metadata?.bot_name || '未知'}: ${(similarity * 100).toFixed(1)}%`);
        
      } catch (err) {
        console.error(`❌ 处理向量 ${vector.bot_id} 时出错:`, err);
      }
    }

    // 按相似度排序
    results.sort((a, b) => b.similarity - a.similarity);

    console.log('\n🏆 排序后的结果:');
    results.forEach((result, index) => {
      const mark = result.similarity >= threshold ? '✅' : '❌';
      console.log(`${mark} ${index + 1}. [${result.vector_type}] ${result.bot_name}: ${(result.similarity * 100).toFixed(1)}%`);
    });

    const matchingResults = results.filter(r => r.similarity >= threshold);
    console.log(`\n📊 满足阈值 ${threshold} 的结果数量: ${matchingResults.length}`);

    if (matchingResults.length > 0) {
      console.log('\n🎉 匹配的内容:');
      matchingResults.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.bot_name} (${(result.similarity * 100).toFixed(1)}%)`);
        console.log(`   类型: ${result.vector_type}`);
        console.log(`   内容: ${result.content}`);
      });
    } else {
      console.log('\n💡 建议:');
      console.log('   1. 降低相似度阈值');
      console.log('   2. 使用更具体的查询词');
      console.log('   3. 检查向量内容是否包含相关信息');
      
      console.log('\n🔍 最高相似度结果:');
      if (results.length > 0) {
        const topResult = results[0];
        console.log(`   ${topResult.bot_name}: ${(topResult.similarity * 100).toFixed(1)}%`);
        console.log(`   内容: ${topResult.content}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

// 主执行函数
async function main() {
  console.log('🎯 机器人人设向量搜索调试工具');
  console.log('=====================================');
  
  await debugVectorSearch();
}

// 运行脚本
if (require.main === module) {
  main();
} 