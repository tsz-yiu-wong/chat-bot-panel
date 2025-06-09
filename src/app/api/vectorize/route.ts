import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

// 初始化OpenAI客户端（仅在服务器端）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// 生成向量
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('向量化失败')
  }
}

// 检查是否支持pgvector
async function checkVectorSupport(): Promise<boolean> {
  try {
    // 简化检查，直接尝试创建向量类型
    const { error } = await supabase
      .from('knowledge_vectors')
      .select('embedding')
      .limit(1)
    
    return !error
  } catch {
    return false
  }
}

// 存储文档向量
export async function POST(request: NextRequest) {
  try {
    const { documentId, content, metadata } = await request.json()
    
    if (!documentId || !content || !metadata) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // documentId应该是UUID字符串
    if (typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'documentId必须是有效的UUID字符串' },
        { status: 400 }
      )
    }

    // 从metadata中获取类型，确保有值
    const documentType = metadata.type || 'abbreviation'
    if (!['abbreviation', 'script'].includes(documentType)) {
      return NextResponse.json(
        { error: 'document_type必须是abbreviation或script' },
        { status: 400 }
      )
    }
    
    // 生成向量
    let embedding: number[] = []
    
    try {
      embedding = await generateEmbedding(content)
    } catch (vectorError) {
      console.warn('OpenAI向量化失败，仅存储文本内容:', vectorError)
      // 如果向量化失败，仍然存储文本内容用于搜索
    }
    
    // 检查向量支持并存储
    const hasVectorSupport = await checkVectorSupport()
    let storeData: any = {
      document_id: documentId,
      document_type: documentType,
      content,
      metadata,
      updated_at: new Date().toISOString()
    }
    
    if (embedding.length > 0) {
      // 总是将向量存储为JSON字符串到embedding字段
      // 这样可以兼容pgvector扩展和常规文本存储
      storeData.embedding = JSON.stringify(embedding)
    }
    
    // 存储到数据库
    const { error } = await supabase
      .from('knowledge_vectors')
      .upsert(storeData)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: `Vector stored for ${documentType} ${documentId}`,
      hasEmbedding: embedding.length > 0,
      vectorSupport: hasVectorSupport
    })
    
  } catch (error) {
    console.error('Error storing document vector:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '向量存储失败' },
      { status: 500 }
    )
  }
}

// 删除文档向量
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const documentType = searchParams.get('documentType') || 'abbreviation'
    
    if (!documentId) {
      return NextResponse.json(
        { error: '缺少documentId参数' },
        { status: 400 }
      )
    }
    
    // 删除向量记录 - 使用document_id和document_type进行精确匹配
    const { error } = await supabase
      .from('knowledge_vectors')
      .delete()
      .eq('document_id', documentId)
      .eq('document_type', documentType)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: `Vector deleted for ${documentType} ${documentId}` 
    })
    
  } catch (error) {
    console.error('Error deleting document vector:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '向量删除失败' },
      { status: 500 }
    )
  }
} 