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

// GET - 获取机器人的向量统计信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServer();
    const { id: botId } = await params;
    
    if (!botId) {
      return NextResponse.json({ error: '缺少机器人ID' }, { status: 400 });
    }

    // 获取机器人的向量统计信息
    const { data: vectors, error } = await supabase
      .from('bot_vectors')
      .select('id, vector_type, embedding, created_at, updated_at')
      .eq('bot_id', botId)
      .eq('is_deleted', false);

    if (error) {
      throw new Error(`获取向量数据失败: ${error.message}`);
    }

    if (!vectors) {
      return NextResponse.json({
        vectorCount: 0,
        vectorTypes: [],
        embeddingCount: 0,
        lastUpdated: null,
        status: 'no_vectors'
      });
    }

    // 统计信息
    const vectorCount = vectors.length;
    const vectorTypes = [...new Set(vectors.map(v => v.vector_type))];
    const embeddingCount = vectors.filter(v => v.embedding).length;
    const lastUpdated = vectors.length > 0 
      ? Math.max(...vectors.map(v => new Date(v.updated_at).getTime()))
      : null;

    // 按类型分组统计
    const typeStats = vectorTypes.map(type => {
      const typeVectors = vectors.filter(v => v.vector_type === type);
      return {
        type,
        count: typeVectors.length,
        hasEmbedding: typeVectors.some(v => v.embedding),
        created: typeVectors[0]?.created_at,
        updated: typeVectors[0]?.updated_at
      };
    });

    // 确定状态
    let status = 'complete';
    if (vectorCount === 0) {
      status = 'no_vectors';
    } else if (embeddingCount === 0) {
      status = 'no_embeddings';
    } else if (embeddingCount < vectorCount) {
      status = 'partial_embeddings';
    }

    return NextResponse.json({
      vectorCount,
      vectorTypes,
      embeddingCount,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      status,
      typeStats,
      completionRate: vectorCount > 0 ? (embeddingCount / vectorCount) * 100 : 0
    });
    
  } catch (error) {
    console.error('Error getting bot vector stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取向量统计失败' },
      { status: 500 }
    );
  }
} 