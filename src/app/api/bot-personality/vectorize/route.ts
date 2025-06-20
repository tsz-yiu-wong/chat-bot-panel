import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import OpenAI from 'openai';

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

// PUT - 更新机器人人设向量
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { botId, personalityData, language } = await request.json();
    
    if (!botId || !personalityData) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 使用数据库函数重新生成向量（支持多语言）
    const { error: functionError } = await supabase.rpc('create_bot_personality_vectors_with_language', {
      p_bot_id: botId,
      p_bot_name: personalityData.bot_name || '',
      p_nationality: personalityData.nationality || '',
      p_age: personalityData.age || null,
      p_gender: personalityData.gender || '',
      p_current_job: personalityData.current_job || '',
      p_values: personalityData.values || '',
      p_life_philosophy: personalityData.life_philosophy || '',
      p_worldview: personalityData.worldview || '',
      p_hobbies: personalityData.hobbies || '',
      p_childhood_experience: personalityData.childhood_experience || '',
      p_work_experience: personalityData.work_experience || '',
      p_relationship_experience: personalityData.relationship_experience || '',
      p_business_experience: personalityData.business_experience || '',
      p_investment_experience: personalityData.investment_experience || '',
      p_favorite_music: personalityData.favorite_music || '',
      p_favorite_movies: personalityData.favorite_movies || '',
      p_favorite_food: personalityData.favorite_food || '',
      p_favorite_fashion: personalityData.favorite_fashion || '',
      p_life_dreams: personalityData.life_dreams || '',
      p_future_thoughts: personalityData.future_thoughts || '',
      p_places_to_visit: personalityData.places_to_visit || '',
      p_language: language || 'zh'
    });

    if (functionError) {
      throw new Error(`数据库函数调用失败: ${functionError.message}`);
    }

    // 获取生成的向量记录
    const { data: vectors, error: fetchError } = await supabase
      .from('bot_vectors')
      .select('*')
      .eq('bot_id', botId)
      .eq('is_deleted', false);

    if (fetchError) {
      throw new Error(`获取向量记录失败: ${fetchError.message}`);
    }

    if (!vectors || vectors.length === 0) {
      return NextResponse.json(
        { error: '未找到向量记录，请确保数据库函数正常工作' },
        { status: 404 }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    // 为每个向量记录生成并更新embedding
    for (const vector of vectors) {
      try {
        const embedding = await generateEmbedding(vector.content);
        
        if (embedding.length > 0) {
          const { error: updateError } = await supabase
            .from('bot_vectors')
            .update({ 
              embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
              updated_at: new Date().toISOString()
            })
            .eq('id', vector.id);

          if (updateError) {
            errors.push(`向量${vector.id}更新失败: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        } else {
          // 即使没有embedding，也更新时间戳
          await supabase
            .from('bot_vectors')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', vector.id);
          updatedCount++;
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (vectorError) {
        errors.push(`向量${vector.id}处理失败: ${vectorError}`);
      }
    }

    const message = `机器人人设向量更新完成: ${updatedCount}/${vectors.length} 条记录成功更新`;
    
    return NextResponse.json({ 
      success: true, 
      message,
      updatedCount,
      totalCount: vectors.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error updating bot personality vectors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '人设向量更新失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除机器人人设向量
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');
    
    if (!botId) {
      return NextResponse.json({ error: '缺少botId参数' }, { status: 400 });
    }
    
    // 软删除该机器人的所有向量记录
    const { data: deletedVectors, error } = await supabase
      .from('bot_vectors')
      .update({ is_deleted: true })
      .eq('bot_id', botId)
      .select('id, vector_type');
    
    if (error) {
      throw new Error(`删除向量失败: ${error.message}`);
    }
    
    const deletedCount = deletedVectors?.length || 0;
    const vectorTypes = deletedVectors?.map(v => v.vector_type).join(', ') || '';
    
    return NextResponse.json({ 
      success: true, 
      message: `机器人人设的所有向量已删除: ${deletedCount} 条记录 (类型: ${vectorTypes})`,
      deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting bot personality vectors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '人设向量删除失败' },
      { status: 500 }
    );
  }
}

// POST - 批量向量化现有人设（用于数据迁移）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // 调用数据库函数进行批量向量化
    const { data: result, error } = await supabase.rpc('vectorize_existing_bot_personalities');
    
    if (error) {
      throw new Error(`批量向量化失败: ${error.message}`);
    }
    
    if (!result || result.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要向量化的人设数据',
        processedCount: 0,
        totalCount: 0
      });
    }
    
    const { processed_count, total_count } = result[0];
    
    // 现在需要为生成的向量记录生成embedding
    const { data: pendingVectors, error: fetchError } = await supabase
      .from('bot_vectors')
      .select('*')
      .is('embedding', null)
      .eq('is_deleted', false);

    if (fetchError) {
      console.error('获取待向量化记录失败:', fetchError);
    }

    let embeddingCount = 0;
    if (pendingVectors && pendingVectors.length > 0) {
      console.log(`开始为 ${pendingVectors.length} 条记录生成embedding...`);
      
      for (const vector of pendingVectors) {
        try {
          const embedding = await generateEmbedding(vector.content);
          
          if (embedding.length > 0) {
            await supabase
              .from('bot_vectors')
              .update({ 
                embedding: `[${embedding.join(',')}]`,
                updated_at: new Date().toISOString()
              })
              .eq('id', vector.id);
            
            embeddingCount++;
          }
          
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`生成向量${vector.id}的embedding失败:`, error);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `批量向量化完成: ${processed_count}/${total_count} 个人设，${embeddingCount} 个向量生成成功`,
      processedCount: processed_count,
      totalCount: total_count,
      embeddingCount
    });
    
  } catch (error) {
    console.error('Error in batch vectorization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量向量化失败' },
      { status: 500 }
    );
  }
} 