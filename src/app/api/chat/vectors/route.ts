import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';
import { getVectorSearchConfig, getChatProcessingConfig } from '@/lib/config/ai-config';

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

// 生成向量
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping embedding generation')
      return []
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
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

// GET - 获取聊天向量统计信息
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const vectorType = url.searchParams.get('vector_type');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (sessionId) {
      // 获取特定会话的向量统计
      const { data: stats, error: statsError } = await supabase
        .rpc('get_session_vector_stats', { p_session_id: sessionId });

      if (statsError) {
        console.error('Stats error:', statsError);
        return NextResponse.json({ error: statsError.message }, { status: 500 });
      }

      // 获取向量详情
      let query = supabase
        .from('chat_message_vectors')
        .select('id, message_id, vector_type, content, embedding, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (vectorType) {
        query = query.eq('vector_type', vectorType);
      }

      const { data: vectors, error: vectorsError } = await query.limit(limit);

      if (vectorsError) {
        console.error('Vectors error:', vectorsError);
        return NextResponse.json({ error: vectorsError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        stats: stats?.[0] || null,
        vectors: vectors || [],
        session_id: sessionId
      });
    } else {
      // 获取全局向量统计
      const { data: globalStats, error } = await supabase
        .from('chat_message_vectors')
        .select('vector_type, session_id')
        .not('embedding', 'is', null);

      if (error) {
        console.error('Global stats error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 统计数据
      const stats = {
        total_vectors: globalStats?.length || 0,
        by_type: {} as Record<string, number>,
        by_session: {} as Record<string, number>,
        sessions_with_vectors: 0
      };

      globalStats?.forEach(vector => {
        stats.by_type[vector.vector_type] = (stats.by_type[vector.vector_type] || 0) + 1;
        stats.by_session[vector.session_id] = (stats.by_session[vector.session_id] || 0) + 1;
      });

      stats.sessions_with_vectors = Object.keys(stats.by_session).length;

      return NextResponse.json({ stats });
    }
  } catch (error) {
    console.error('Error fetching chat vectors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 搜索相似聊天内容
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const config = getVectorSearchConfig();
    
    const { 
      query, 
      session_id, 
      limit = config.limit,                           // 使用配置文件的默认值
      similarity_threshold = config.similarity_threshold, // 使用配置文件的默认值
      exclude_message_id,
      include_context = config.include_context        // 使用配置文件的默认值
    } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: '缺少搜索查询' }, { status: 400 });
    }

    // 生成查询向量
    const queryEmbedding = await generateEmbedding(query);
    
    if (queryEmbedding.length === 0) {
      // 如果无法生成向量，回退到文本搜索
      let textQuery = supabase
        .from('chat_message_vectors')
        .select(`
          id, session_id, message_id, content, vector_type, created_at,
          chat_messages!inner(role, created_at),
          chat_sessions!inner(session_name, chat_users!inner(display_name))
        `)
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (session_id) {
        textQuery = textQuery.eq('session_id', session_id);
      }

      if (exclude_message_id) {
        textQuery = textQuery.neq('message_id', exclude_message_id);
      }

      const { data: vectors, error } = await textQuery;

      if (error) {
        throw new Error(`文本搜索失败: ${error.message}`);
      }

      return NextResponse.json({
        results: vectors?.map(v => ({
          vector_id: v.id,
          message_id: v.message_id,
          session_id: v.session_id,
          content: v.content,
          vector_type: v.vector_type,
          similarity: 0.5, // 默认相似度
          created_at: v.created_at,
          session_name: Array.isArray(v.chat_sessions) ? v.chat_sessions[0]?.session_name : '未知会话',
          user_name: Array.isArray(v.chat_sessions) && Array.isArray(v.chat_sessions[0]?.chat_users) 
            ? v.chat_sessions[0].chat_users[0]?.display_name : '未知用户',
          message_role: Array.isArray(v.chat_messages) ? v.chat_messages[0]?.role : 'unknown'
        })) || []
      });
    }

    // 获取所有相关向量数据进行相似度计算
    let query_builder = supabase
      .from('chat_message_vectors')
      .select(`
        id, session_id, message_id, content, vector_type, embedding, created_at,
        chat_messages!inner(role, created_at),
        chat_sessions!inner(session_name, 
          chat_users!inner(display_name)
        )
      `)
      .not('embedding', 'is', null);

    // 可选参数过滤
    if (session_id) {
      query_builder = query_builder.eq('session_id', session_id);
    }

    if (exclude_message_id) {
      query_builder = query_builder.neq('message_id', exclude_message_id);
    }

    // 向量类型过滤
    if (include_context) {
      query_builder = query_builder.eq('vector_type', 'qa');  // 现在只有qa类型
    } else {
      query_builder = query_builder.eq('vector_type', 'qa');  // 现在只有qa类型
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
        message: session_id ? '当前会话没有向量数据' : '没有找到向量数据'
      });
    }

    // 计算相似度并排序
    const results: Array<{
      vector_id: string;
      message_id: string;
      session_id: string;
      content: string;
      vector_type: string;
      similarity: number;
      created_at: string;
      session_name: string;
      user_name: string;
      message_role: string;
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
        
        if (similarity >= similarity_threshold) {
          results.push({
            vector_id: vector.id,
            message_id: vector.message_id,
            session_id: vector.session_id,
            content: vector.content,
            vector_type: vector.vector_type,
            similarity: similarity,
            created_at: vector.created_at,
            session_name: Array.isArray(vector.chat_sessions) ? vector.chat_sessions[0]?.session_name : '未知会话',
            user_name: Array.isArray(vector.chat_sessions) && Array.isArray(vector.chat_sessions[0]?.chat_users) 
              ? vector.chat_sessions[0].chat_users[0]?.display_name : '未知用户',
            message_role: Array.isArray(vector.chat_messages) ? vector.chat_messages[0]?.role : 'unknown'
          });
        }
      } catch (err) {
        console.error(`处理向量 ${vector.id} 时出错:`, err);
        continue;
      }
    }

    // 按相似度排序并限制结果数量
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      total: results.length,
      query,
      similarity_threshold,
      session_id
    });
    
  } catch (error) {
    console.error('聊天向量搜索API出错:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新聊天向量embedding
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const config = getChatProcessingConfig();
    
    const { 
      session_id,
      vector_type,
      batch_size = config.batch_size  // 使用配置文件的默认值
    } = await request.json();
    
    if (!session_id) {
      return NextResponse.json({ error: '缺少 session_id 参数' }, { status: 400 });
    }

    // 获取需要更新embedding的向量记录
    let query = supabase
      .from('chat_message_vectors')
      .select('id, content')
      .eq('session_id', session_id)
      .is('embedding', null)
      .order('created_at', { ascending: false })
      .limit(batch_size);

    if (vector_type) {
      query = query.eq('vector_type', vector_type);
    }

    const { data: vectors, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`获取向量记录失败: ${fetchError.message}`);
    }

    if (!vectors || vectors.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要更新的向量记录',
        updated_count: 0,
        total_count: 0
      });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // 为每个向量记录生成并更新embedding
    for (const vector of vectors) {
      try {
        const embedding = await generateEmbedding(vector.content);
        
        if (embedding.length > 0) {
          const { error: updateError } = await supabase
            .from('chat_message_vectors')
            .update({ 
              embedding: `[${embedding.join(',')}]` // PostgreSQL JSON 格式
            })
            .eq('id', vector.id);

          if (updateError) {
            errors.push(`向量${vector.id}更新失败: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, config.embedding_delay_ms)); // 使用配置文件的延迟设置
      } catch (vectorError) {
        errors.push(`向量${vector.id}处理失败: ${vectorError}`);
      }
    }

    const message = `聊天向量更新完成: ${updatedCount}/${vectors.length} 条记录成功更新`;
    
    return NextResponse.json({ 
      success: true, 
      message,
      updated_count: updatedCount,
      total_count: vectors.length,
      session_id,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error updating chat vectors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '聊天向量更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 清理聊天向量
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const daysToKeep = parseInt(searchParams.get('days_to_keep') || '30');
    
    if (!sessionId) {
      return NextResponse.json({ error: '缺少 session_id 参数' }, { status: 400 });
    }
    
    // 调用数据库清理函数
    const { data: result, error } = await supabase
      .rpc('cleanup_chat_message_vectors', { 
        p_days_to_keep: daysToKeep,
        p_session_id: sessionId 
      });
    
    if (error) {
      throw new Error(`清理向量失败: ${error.message}`);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `已清理 ${result} 条聊天向量记录`,
      deleted_count: result,
      session_id: sessionId,
      days_to_keep: daysToKeep
    });
    
  } catch (error) {
    console.error('Error cleaning chat vectors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '聊天向量清理失败' },
      { status: 500 }
    );
  }
} 