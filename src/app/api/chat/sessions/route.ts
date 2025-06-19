import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

// GET - 获取聊天会话
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');
    const userId = url.searchParams.get('user_id');

    if (sessionId) {
      // 获取单个会话详情
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_users(id, username, display_name),
          bot_personalities(id, bot_name)
        `)
        .eq('id', sessionId)
        .eq('is_deleted', false)
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!session) {
        return NextResponse.json({ error: '会话不存在' }, { status: 404 });
      }

      return NextResponse.json({ session });
    } else if (userId) {
      // 获取用户的所有会话
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_users(id, username, display_name),
          bot_personalities(id, bot_name)
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ sessions });
    } else {
      // 获取所有会话（管理员用）
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_users(id, username, display_name),
          bot_personalities(id, bot_name)
        `)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ sessions });
    }
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 创建新聊天会话
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { 
      user_id, 
      bot_personality_id, 
      session_name = '新对话',
      message_merge_seconds = 300,
      topic_trigger_hours = 24,
      is_topic_enabled = true
    } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    // 验证用户存在
    const { data: user, error: userError } = await supabase
      .from('chat_users')
      .select('id')
      .eq('id', user_id)
      .eq('is_deleted', false)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 400 });
    }

    // 创建会话
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id,
        bot_personality_id,
        session_name,
        message_merge_seconds,
        topic_trigger_hours,
        is_topic_enabled
      })
      .select(`
        *,
        chat_users(id, username, display_name),
        bot_personalities(id, bot_name)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 更新聊天会话
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { 
      id, 
      session_name, 
      bot_personality_id,
      message_merge_seconds,
      topic_trigger_hours,
      is_topic_enabled
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (session_name !== undefined) updateData.session_name = session_name;
    if (bot_personality_id !== undefined) updateData.bot_personality_id = bot_personality_id;
    if (message_merge_seconds !== undefined) updateData.message_merge_seconds = message_merge_seconds;
    if (topic_trigger_hours !== undefined) updateData.topic_trigger_hours = topic_trigger_hours;
    if (is_topic_enabled !== undefined) updateData.is_topic_enabled = is_topic_enabled;

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select(`
        *,
        chat_users(id, username, display_name),
        bot_personalities(id, bot_name)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 软删除聊天会话
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    // 软删除会话
    const { error } = await supabase
      .from('chat_sessions')
      .update({ is_deleted: true })
      .eq('id', sessionId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '会话删除成功' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 