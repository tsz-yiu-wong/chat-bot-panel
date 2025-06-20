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

// GET - 获取单个Prompt的详细信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServer();
    const { id: promptId } = await params;

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 });
    }

    // 获取单个prompt的详细信息
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 