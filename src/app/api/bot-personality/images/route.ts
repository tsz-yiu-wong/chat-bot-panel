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

// GET - 获取机器人的图片（RLS禁用期间不限制用户）
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    const url = new URL(request.url);
    const botId = url.searchParams.get('bot_id');
    const imageType = url.searchParams.get('image_type');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // 获取图片列表
    let query = supabase
      .from('bot_images')
      .select('*')
      .eq('bot_id', botId)
      .order('sort_order', { ascending: true });

    if (imageType) {
      query = query.eq('image_type', imageType);
    }

    const { data: images, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching bot images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 上传新图片
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const botId = formData.get('bot_id') as string;
    const imageType = formData.get('image_type') as string;
    const description = formData.get('description') as string;

    if (!file || !botId || !imageType) {
      return NextResponse.json({ error: 'File, bot_id, and image_type are required' }, { status: 400 });
    }

    // 生成文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${botId}/${imageType}/${Date.now()}.${fileExt}`;

    // 上传文件到Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('bot-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 获取公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('bot-images')
      .getPublicUrl(fileName);

    // 获取当前最大排序号
    const { data: maxSortData } = await supabase
      .from('bot_images')
      .select('sort_order')
      .eq('bot_id', botId)
      .eq('image_type', imageType)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = maxSortData && maxSortData.length > 0 
      ? maxSortData[0].sort_order + 1 
      : 0;

    // 保存图片信息到数据库
    const { data: image, error: dbError } = await supabase
      .from('bot_images')
      .insert({
        bot_id: botId,
        image_type: imageType,
        image_url: publicUrl,
        image_name: file.name,
        description: description || null,
        sort_order: sortOrder
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // 如果数据库插入失败，删除已上传的文件
      await supabase.storage.from('bot-images').remove([fileName]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error('Error uploading bot image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 删除图片
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    const url = new URL(request.url);
    const imageId = url.searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // 获取图片信息
    const { data: image, error: imageError } = await supabase
      .from('bot_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (imageError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // 从Storage删除文件
    const fileName = image.image_url.split('/').slice(-3).join('/'); // 获取相对路径

    const { error: storageError } = await supabase.storage
      .from('bot-images')
      .remove([fileName]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // 从数据库删除记录
    const { error: dbError } = await supabase
      .from('bot_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting bot image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 更新图片信息
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    const { id, description, sort_order } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // 更新图片信息
    const { data: image, error } = await supabase
      .from('bot_images')
      .update({
        description: description || null,
        sort_order: sort_order
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error('Error updating bot image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 