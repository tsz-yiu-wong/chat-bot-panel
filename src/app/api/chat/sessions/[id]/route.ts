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
        get: (_name: string) => undefined,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set: (_name: string, _value: string, _options: CookieOptions) => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove: (_name: string, _options: CookieOptions) => {}
      },
    }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServer();
    const { id: sessionId } = await params;
    const { session_name, message_merge_seconds, topic_trigger_hours, bot_personality_id, is_topic_enabled } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: { [key: string]: any } = {};
    if (session_name) updateData.session_name = session_name;
    if (message_merge_seconds !== undefined) updateData.message_merge_seconds = message_merge_seconds;
    if (topic_trigger_hours !== undefined) updateData.topic_trigger_hours = topic_trigger_hours;
    if (bot_personality_id !== undefined) updateData.bot_personality_id = bot_personality_id;
    if (is_topic_enabled !== undefined) updateData.is_topic_enabled = is_topic_enabled;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: '没有提供可更新的字段' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Database error updating session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 