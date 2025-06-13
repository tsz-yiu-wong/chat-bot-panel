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

// GET - 获取所有机器人人设（RLS禁用期间不限制用户）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 获取机器人人设列表
    const { data: personalities, error } = await supabase
      .from('bot_personalities')
      .select('*')
      .eq('is_active', true)
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
    const personalityData: Partial<BotPersonality> = await request.json();
    
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
    const { id, ...personalityData }: BotPersonality = await request.json();
    
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

    // 软删除（设置is_active为false）
    const { error } = await supabase
      .from('bot_personalities')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Personality deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot personality:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 