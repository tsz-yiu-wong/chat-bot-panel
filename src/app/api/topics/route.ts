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

// GET - 获取所有话题库（过滤软删除记录）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // 获取话题库列表 - 过滤软删除记录
    const { data: topicLibraries, error } = await supabase
      .from('topic_categories')
      .select('id, library_name:name_cn')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topicLibraries });
  } catch (error) {
    console.error('Error fetching topic libraries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 