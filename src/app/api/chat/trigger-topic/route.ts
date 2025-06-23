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

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { session_id, topic_category_id } = await request.json();

    if (!session_id || !topic_category_id) {
      return NextResponse.json({ error: '会话ID和话题库ID不能为空' }, { status: 400 });
    }

    // 从指定分类中获取最多50个话题
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('content')
      .eq('category_id', topic_category_id)
      .eq('is_deleted', false)
      .limit(50);

    if (topicsError || !topics || topics.length === 0) {
      console.error('Topic fetch error:', topicsError);
      return NextResponse.json({ error: '无法从此话题库获取话题或话题库为空' }, { status: 404 });
    }

    // 在应用层随机选择一个话题
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    // 将话题作为 'topic' 角色的消息插入
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        role: 'topic',
        content: randomTopic.content,
        is_processed: true, // 标记为已处理，不进入LLM流程
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error inserting topic message:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    
    // 更新会话的最后消息时间
    await supabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', session_id);

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Error triggering topic:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 