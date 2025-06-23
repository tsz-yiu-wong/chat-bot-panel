import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';
import { getChatProcessingConfig } from '@/lib/config/ai-config';

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

// POST - 批量向量化现有聊天消息
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const config = getChatProcessingConfig();
    
    const { 
      session_id, 
      limit = 100,  // 批量处理保持较大的默认值
      force_regenerate = false 
    } = await request.json();
    
    // 调用数据库函数创建向量记录
    const { data: result, error } = await supabase.rpc('vectorize_existing_chat_messages', {
      p_session_id: session_id || null,
      p_limit: limit
    });
    
    if (error) {
      throw new Error(`批量向量化失败: ${error.message}`);
    }
    
    if (!result || result.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要向量化的聊天消息',
        processed_count: 0,
        total_count: 0,
        session_id
      });
    }
    
    const { processed_count, total_count } = result[0];
    
    // 现在需要为生成的向量记录生成embedding
    let query = supabase
      .from('chat_message_vectors')
      .select('id, content')
      .is('embedding', null);

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    // 如果强制重新生成，包含已有embedding的记录
    if (force_regenerate) {
      query = supabase
        .from('chat_message_vectors')
        .select('id, content');
      
      if (session_id) {
        query = query.eq('session_id', session_id);
      }
    }

    const { data: pendingVectors, error: fetchError } = await query.limit(limit);

    if (fetchError) {
      console.error('获取待向量化记录失败:', fetchError);
    }

    let embeddingCount = 0;
    const embeddingErrors: string[] = [];
    
    if (pendingVectors && pendingVectors.length > 0) {
      console.log(`开始为 ${pendingVectors.length} 条记录生成embedding...`);
      
      for (const vector of pendingVectors) {
        try {
          const embedding = await generateEmbedding(vector.content);
          
          if (embedding.length > 0) {
            const { error: updateError } = await supabase
              .from('chat_message_vectors')
              .update({ 
                embedding: `[${embedding.join(',')}]`
              })
              .eq('id', vector.id);
            
            if (updateError) {
              embeddingErrors.push(`向量${vector.id}的embedding更新失败: ${updateError.message}`);
            } else {
              embeddingCount++;
            }
          }
          
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, config.embedding_delay_ms)); // 使用配置文件的延迟设置
        } catch (error) {
          embeddingErrors.push(`生成向量${vector.id}的embedding失败: ${error}`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `批量向量化完成: ${processed_count}/${total_count} 条聊天消息，${embeddingCount} 个向量生成成功`,
      processed_count,
      total_count,
      embedding_count: embeddingCount,
      session_id,
      errors: embeddingErrors.length > 0 ? embeddingErrors : undefined
    });
    
  } catch (error) {
    console.error('Error in batch chat vectorization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量向量化失败' },
      { status: 500 }
    );
  }
}

// GET - 获取批量向量化进度和统计
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    // 获取消息统计
    let messageQuery = supabase
      .from('chat_messages')
      .select('id, role, is_processed', { count: 'exact' })
      .in('role', ['user', 'assistant']);

    if (sessionId) {
      messageQuery = messageQuery.eq('session_id', sessionId);
    }

    const { count: totalMessages, error: messageError } = await messageQuery;

    if (messageError) {
      throw new Error(`获取消息统计失败: ${messageError.message}`);
    }

    // 获取已处理用户消息统计
    let processedUserQuery = supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('role', 'user')
      .eq('is_processed', true);

    if (sessionId) {
      processedUserQuery = processedUserQuery.eq('session_id', sessionId);
    }

    const { count: processedUserMessages, error: processedError } = await processedUserQuery;

    if (processedError) {
      throw new Error(`获取已处理消息统计失败: ${processedError.message}`);
    }

    // 获取向量统计
    let vectorQuery = supabase
      .from('chat_message_vectors')
      .select('id, vector_type, embedding', { count: 'exact' });

    if (sessionId) {
      vectorQuery = vectorQuery.eq('session_id', sessionId);
    }

    const { data: vectors, count: totalVectors, error: vectorError } = await vectorQuery;

    if (vectorError) {
      throw new Error(`获取向量统计失败: ${vectorError.message}`);
    }

    // 统计有embedding的向量
    const vectorsWithEmbedding = vectors?.filter(v => v.embedding) || [];
    const vectorsWithoutEmbedding = (totalVectors || 0) - vectorsWithEmbedding.length;

    // 按类型分组统计
    const vectorsByType = vectors?.reduce((acc, vector) => {
      acc[vector.vector_type] = (acc[vector.vector_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 需要向量化的消息数量（已处理的用户消息 + 所有AI消息）
    let aiMessageQuery = supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('role', 'assistant');

    if (sessionId) {
      aiMessageQuery = aiMessageQuery.eq('session_id', sessionId);
    }

    const { count: aiMessages, error: aiError } = await aiMessageQuery;

    if (aiError) {
      throw new Error(`获取AI消息统计失败: ${aiError.message}`);
    }

    const shouldHaveVectors = (processedUserMessages || 0) + (aiMessages || 0);
    const vectorizationProgress = shouldHaveVectors > 0 
      ? Math.round(((totalVectors || 0) / shouldHaveVectors) * 100) 
      : 100;

    const embeddingProgress = (totalVectors || 0) > 0 
      ? Math.round((vectorsWithEmbedding.length / (totalVectors || 1)) * 100) 
      : 0;

    return NextResponse.json({
      session_id: sessionId,
      message_stats: {
        total_messages: totalMessages || 0,
        processed_user_messages: processedUserMessages || 0,
        ai_messages: aiMessages || 0,
        should_have_vectors: shouldHaveVectors
      },
      vector_stats: {
        total_vectors: totalVectors || 0,
        vectors_with_embedding: vectorsWithEmbedding.length,
        vectors_without_embedding: vectorsWithoutEmbedding,
        vectors_by_type: vectorsByType
      },
      progress: {
        vectorization_progress: vectorizationProgress,
        embedding_progress: embeddingProgress,
        is_vectorization_complete: vectorizationProgress >= 100,
        is_embedding_complete: embeddingProgress >= 100
      }
    });

  } catch (error) {
    console.error('Error getting batch vectorization progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取进度失败' },
      { status: 500 }
    );
  }
} 