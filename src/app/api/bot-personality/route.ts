import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { BotPersonality } from '@/lib/types/bot-personality';

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

// 调用向量化API
async function updatePersonalityVectors(botId: string, personalityData: BotPersonality, language?: string) {
  try {
    // 内部API调用向量化服务
    const vectorizeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bot-personality/vectorize`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botId,
        personalityData,
        language
      })
    });

    if (!vectorizeResponse.ok) {
      console.warn('向量化失败，但不影响主要操作:', await vectorizeResponse.text());
    } else {
      const result = await vectorizeResponse.json();
      console.log('向量化成功:', result.message);
    }
  } catch (error) {
    console.warn('向量化调用失败，但不影响主要操作:', error);
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
      setImmediate(() => {
        updatePersonalityVectors(personality.id, personality, language || 'zh');
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
    setImmediate(() => {
      updatePersonalityVectors(id, personality, language || 'zh');
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