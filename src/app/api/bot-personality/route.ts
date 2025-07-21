import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { BotPersonality } from '@/lib/types/bot-personality';
import OpenAI from 'openai';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

// 临时用户ID（RLS禁用期间使用）
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000';

// 生成Embedding向量
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping embedding generation');
      return [];
    }
    if (!content || content.trim() === '') {
      return [];
    }
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

// 异步生成并更新Embeddings
async function generateAndUpdateEmbeddings(botId: string) {
  try {
    const supabase = createSupabaseServer();
    console.log(`[Embedding] 开始为机器人 ${botId} 异步生成embedding...`);
    
    const { data: vectors, error: fetchError } = await supabase
      .from('bot_vectors')
      .select('id, content')
      .eq('bot_id', botId)
      .eq('is_deleted', false);

    if (fetchError) {
      console.error(`[Embedding] 获取机器人 ${botId} 的向量记录失败:`, fetchError);
      return;
    }

    if (!vectors || vectors.length === 0) {
      console.log(`[Embedding] 机器人 ${botId} 没有需要处理的向量。`);
      return;
    }

    let updatedCount = 0;
    for (const vector of vectors) {
      const embedding = await generateEmbedding(vector.content);
      if (embedding.length > 0) {
        const { error: updateError } = await supabase
          .from('bot_vectors')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', vector.id);
        
        if (updateError) {
          console.error(`[Embedding] 更新向量 ${vector.id} 失败:`, updateError);
        } else {
          updatedCount++;
        }
      }
      // 添加小延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ [Embedding] 机器人 ${botId} 的 ${updatedCount}/${vectors.length} 个 embedding 已异步更新。`);
  } catch (error) {
    console.error(`🔴 [Embedding] 机器人 ${botId} 的异步更新 embedding 过程失败:`, error);
  }
}

// 调用向量化API
async function updatePersonalityVectors(botId: string, personalityData: BotPersonality, language?: string) {
  try {
    // 直接调用数据库函数，避免内部API调用
    const supabase = createSupabaseServer();
    
    const { error: functionError } = await supabase.rpc('create_bot_personality_vectors_with_language', {
      p_bot_id: botId,
      p_bot_name: personalityData.bot_name || '',
      p_nationality: personalityData.nationality || '',
      p_age: personalityData.age || null,
      p_gender: personalityData.gender || '',
      p_height: personalityData.height || '',
      p_weight: personalityData.weight || '',
      p_blood_type: personalityData.blood_type || '',
      p_zodiac_sign: personalityData.zodiac_sign || '',
      p_birth_date: personalityData.birth_date || '',
      p_birth_place: personalityData.birth_place || '',
      p_education_level: personalityData.education_level || '',
      p_graduate_school: personalityData.graduate_school || '',
      p_major: personalityData.major || '',
      p_current_address: personalityData.current_address || '',
      p_current_job: personalityData.current_job || '',
      p_work_address: personalityData.work_address || '',
      p_daily_routine: personalityData.daily_routine || null,
      p_favorite_music: personalityData.favorite_music || '',
      p_favorite_movies: personalityData.favorite_movies || '',
      p_favorite_fashion: personalityData.favorite_fashion || '',
      p_favorite_hairstyle: personalityData.favorite_hairstyle || '',
      p_favorite_food: personalityData.favorite_food || '',
      p_favorite_restaurants: personalityData.favorite_restaurants || '',
      p_hobbies: personalityData.hobbies || '',
      p_worldview: personalityData.worldview || '',
      p_life_philosophy: personalityData.life_philosophy || '',
      p_values: personalityData.values || '',
      p_life_timeline: personalityData.life_timeline || null,
      p_family_members: personalityData.family_members || null,
      p_childhood_experience: personalityData.childhood_experience || '',
      p_childhood_stories: personalityData.childhood_stories || '',
      p_growth_experience: personalityData.growth_experience || '',
      p_relationship_experience: personalityData.relationship_experience || '',
      p_marital_status: personalityData.marital_status || '',
      p_marriage_history: personalityData.marriage_history || '',
      p_work_experience: personalityData.work_experience || '',
      p_business_experience: personalityData.business_experience || '',
      p_investment_experience: personalityData.investment_experience || '',
      p_places_to_visit: personalityData.places_to_visit || '',
      p_life_dreams: personalityData.life_dreams || '',
      p_future_thoughts: personalityData.future_thoughts || '',
      p_language: language || 'zh'
    });

    if (functionError) {
      console.error('🔴 数据库向量化失败:', functionError);
      console.error('🔴 错误详情:', JSON.stringify(functionError, null, 2));
      console.error('🔴 可能需要运行数据库更新脚本: database/bot_personality_vectors_update.sql');
    } else {
      console.log('✅ 向量化成功: 直接调用数据库函数');
    }
  } catch (error) {
    console.error('🔴 向量化调用失败:', error);
    console.error('🔴 建议检查数据库函数是否存在');
  }
}

// 删除向量
async function deletePersonalityVectors(botId: string) {
  try {
    const vectorizeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bot-personality/vectorize?botId=${botId}`, {
      method: 'DELETE',
    });

    if (!vectorizeResponse.ok) {
      console.warn('向量删除失败，但不影响主要操作:', await vectorizeResponse.text());
    } else {
      const result = await vectorizeResponse.json();
      console.log('向量删除成功:', result.message);
    }
  } catch (error) {
    console.warn('向量删除调用失败，但不影响主要操作:', error);
  }
}

// GET - 获取所有机器人人设（过滤软删除记录）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 获取机器人人设列表 - 过滤软删除记录
    const { data: personalities, error } = await supabase
      .from('bot_personalities')
      .select('*')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ personalities });
  } catch (error) {
    console.error('Error fetching bot personalities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 创建新的机器人人设
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 解析请求体
    const { language, ...personalityData }: Partial<BotPersonality> & { language?: string } = await request.json();
    
    // 验证必填字段
    if (!personalityData.bot_name) {
      return NextResponse.json({ error: 'Bot name is required' }, { status: 400 });
    }

    // 插入数据（使用临时用户ID）
    const { data: personality, error } = await supabase
      .from('bot_personalities')
      .insert({
        ...personalityData,
        user_id: TEMP_USER_ID
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 异步进行向量化（不阻塞响应），传递语言参数
    if (personality?.id) {
      setImmediate(async () => {
        await updatePersonalityVectors(personality.id, personality, language || 'zh');
        await generateAndUpdateEmbeddings(personality.id);
      });
    }

    return NextResponse.json({ personality }, { status: 201 });
  } catch (error) {
    console.error('Error creating bot personality:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 更新机器人人设
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 解析请求体
    const { id, language, ...personalityData }: BotPersonality & { language?: string } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 更新数据（RLS禁用期间不限制用户）
    const { data: personality, error } = await supabase
      .from('bot_personalities')
      .update(personalityData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!personality) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 });
    }

    // 异步进行向量化更新（不阻塞响应），传递语言参数
    setImmediate(async () => {
      await updatePersonalityVectors(id, personality, language || 'zh');
      await generateAndUpdateEmbeddings(id);
    });

    return NextResponse.json({ personality });
  } catch (error) {
    console.error('Error updating bot personality:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 删除机器人人设（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 获取要删除的ID
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 软删除 - 使用统一的is_deleted字段
    const { error } = await supabase
      .from('bot_personalities')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 同时软删除关联的图片
    const { error: imageError } = await supabase
      .from('bot_images')
      .update({ is_deleted: true })
      .eq('bot_id', id);

    if (imageError) {
      console.error('Error soft deleting images:', imageError);
      // 图片删除失败不影响主要删除操作，只记录日志
    }

    // 异步删除向量（不阻塞响应）
    setImmediate(() => {
      deletePersonalityVectors(id);
    });

    return NextResponse.json({ message: 'Personality deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot personality:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 