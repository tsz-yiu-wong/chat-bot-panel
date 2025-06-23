import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';
import { getKnowledgeRetrievalConfig } from '@/lib/config/ai-config';

// 创建Supabase客户端
function createSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        get(_name: string) {
          return undefined;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set(_name: string, _value: string, _options: CookieOptions) {
          // 不处理cookie设置
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove(_name: string, _options: CookieOptions) {
          // 不处理cookie移除
        }
      },
    }
  );
}

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// 生成查询向量
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping embedding generation')
      return []
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    return []
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
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

// POST - 搜索相似的机器人人设
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const config = getKnowledgeRetrievalConfig();
    
    const { 
      query, 
      limit = config.personality_matching.limit, 
      similarity_threshold = config.personality_matching.similarity_threshold,  // 使用配置
      vector_type = null,
      exclude_bot_id = null,
      include_bot_id = null 
    } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: '缺少搜索查询' }, { status: 400 });
    }

    // 生成查询向量
    const queryEmbedding = await generateQueryEmbedding(query);
    
    if (queryEmbedding.length === 0) {
      // 如果无法生成向量，回退到文本搜索
      let textQuery = supabase
        .from('bot_personalities')
        .select('*')
        .eq('is_deleted', false)
        .or(`bot_name.ilike.%${query}%,values.ilike.%${query}%,hobbies.ilike.%${query}%`)
        .limit(limit);

      // 如果指定了只搜索特定机器人
      if (include_bot_id) {
        textQuery = textQuery.eq('id', include_bot_id);
      }

      const { data: personalities, error } = await textQuery;

      if (error) {
        throw new Error(`文本搜索失败: ${error.message}`);
      }

      return NextResponse.json({
        results: personalities?.map(p => ({
          bot_id: p.id,
          bot_name: p.bot_name,
          similarity: 0.5, // 默认相似度
          vector_type: 'text_search',
          content: `${p.bot_name} - ${p.values || ''} ${p.hobbies || ''}`.trim(),
          metadata: {
            bot_name: p.bot_name,
            search_type: 'text_fallback'
          }
        })) || []
      });
    }

    // 获取所有向量数据进行相似度计算
    let query_builder = supabase
      .from('bot_vectors')
      .select('bot_id, vector_type, content, embedding, metadata')
      .eq('is_deleted', false)
      .not('embedding', 'is', null);

    if (vector_type) {
      query_builder = query_builder.eq('vector_type', vector_type);
    }

    // 如果指定了只搜索特定机器人
    if (include_bot_id) {
      query_builder = query_builder.eq('bot_id', include_bot_id);
    } else if (exclude_bot_id) {
      query_builder = query_builder.neq('bot_id', exclude_bot_id);
    }

    const { data: vectors, error: vectorError } = await query_builder;

    if (vectorError) {
      throw new Error(`获取向量数据失败: ${vectorError.message}`);
    }

    if (!vectors || vectors.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        query,
        similarity_threshold,
        message: include_bot_id ? '当前机器人没有向量数据' : '没有找到向量数据'
      });
    }

    // 计算相似度并排序
    const results: Array<{
      bot_id: string;
      bot_name: string;
      vector_type: string;
      content: string;
      similarity: number;
      metadata: Record<string, unknown>;
      personality?: Record<string, unknown>;
    }> = [];
    
    for (const vector of vectors) {
      try {
        let embedding: number[];
        
        if (typeof vector.embedding === 'string') {
          try {
            embedding = JSON.parse(vector.embedding);
          } catch {
            continue;
          }
        } else if (Array.isArray(vector.embedding)) {
          embedding = vector.embedding;
        } else {
          continue;
        }

        if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
          continue;
        }

        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        // 所有向量都需要满足相似度阈值要求
        if (similarity >= similarity_threshold) {
          results.push({
            bot_id: vector.bot_id,
            bot_name: vector.metadata?.bot_name || '未知',
            vector_type: vector.vector_type,
            content: vector.content,
            similarity: similarity,
            metadata: vector.metadata
          });
        }
      } catch (err) {
        console.error(`处理向量 ${vector.bot_id} 时出错:`, err);
        continue;
      }
    }

    // 按相似度排序并限制结果数量
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);

    // 获取机器人详细信息
    if (limitedResults.length > 0) {
      const botIds = [...new Set(limitedResults.map(r => r.bot_id))];
      const { data: personalities, error: personalityError } = await supabase
        .from('bot_personalities')
        .select('id, bot_name, nationality, age, gender, current_job, values, hobbies')
        .in('id', botIds)
        .eq('is_deleted', false);

      if (!personalityError && personalities) {
        // 将人设信息合并到结果中
        limitedResults.forEach(result => {
          const personality = personalities.find(p => p.id === result.bot_id);
          if (personality) {
            result.personality = personality;
          }
        });
      }
    }

    return NextResponse.json({
      results: limitedResults,
      total: results.length,
      query,
      similarity_threshold
    });
    
  } catch (error) {
    console.error('向量搜索API出错:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    );
  }
} 