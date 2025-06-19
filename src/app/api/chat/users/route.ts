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

// GET - 获取聊天用户列表
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (userId) {
      // 获取单个用户信息（包含标签）
      const { data: user, error: userError } = await supabase
        .from('chat_users')
        .select('*')
        .eq('id', userId)
        .eq('is_deleted', false)
        .single();

      if (userError) {
        console.error('Database error:', userError);
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }

      // 获取用户标签
      const { data: tags, error: tagsError } = await supabase
        .rpc('get_user_tags', { user_uuid: userId });

      if (tagsError) {
        console.error('Tags error:', tagsError);
      }

      return NextResponse.json({ 
        user: {
          ...user,
          tags: tags || []
        }
      });
    } else {
      // 获取用户列表
      const { data: users, error } = await supabase
        .from('chat_users')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ users });
    }
  } catch (error) {
    console.error('Error fetching chat users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 创建新聊天用户
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { username, display_name, avatar_url, metadata = {} } = await request.json();

    if (!username) {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    // 创建用户
    const { data: user, error } = await supabase
      .from('chat_users')
      .insert({
        username,
        display_name,
        avatar_url,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') { // 唯一约束违反
        return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 为新用户添加"新用户"标签
    const { error: tagError } = await supabase
      .rpc('add_user_tag', { 
        user_uuid: user.id, 
        tag_name_param: '新用户',
        assigned_by_param: 'system'
      });

    if (tagError) {
      console.error('Tag assignment error:', tagError);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 更新聊天用户信息
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { id, username, display_name, avatar_url, metadata } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (username !== undefined) updateData.username = username;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: user, error } = await supabase
      .from('chat_users')
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating chat user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 软删除聊天用户
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    // 软删除用户
    const { error } = await supabase
      .from('chat_users')
      .update({ is_deleted: true })
      .eq('id', userId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('Error deleting chat user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 