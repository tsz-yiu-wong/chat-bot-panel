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
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, skipping embedding generation')
      return []
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    return []
  }
}

// 更新知识库记录的所有向量
export async function PUT(request: NextRequest) {
  try {
    const { documentId, documentType, data } = await request.json()
    
    if (!documentId || !documentType || !data) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    if (!['abbreviation', 'script'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType必须是abbreviation或script' },
        { status: 400 }
      )
    }

    // 数据库触发器已经在UPDATE操作时创建了向量记录框架
    // 我们需要获取这些向量记录并为它们生成embedding
    
    // 获取该文档的所有向量记录
    const { data: vectors, error: fetchError } = await supabase
      .from('knowledge_vectors')
      .select('*')
      .eq('document_id', documentId)
      .eq('document_type', documentType)

    if (fetchError) {
      throw new Error(`获取向量记录失败: ${fetchError.message}`)
    }

    if (!vectors || vectors.length === 0) {
      return NextResponse.json(
        { error: '未找到向量记录，请确保数据库触发器正常工作' },
        { status: 404 }
      )
    }

    let updatedCount = 0
    const errors: string[] = []

    // 为每个向量记录生成并更新embedding
    for (const vector of vectors) {
      try {
        const embedding = await generateEmbedding(vector.content)
        
        if (embedding.length > 0) {
          const { error: updateError } = await supabase
            .from('knowledge_vectors')
            .update({ 
              embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
              updated_at: new Date().toISOString()
            })
            .eq('id', vector.id)

          if (updateError) {
            errors.push(`向量${vector.id}更新失败: ${updateError.message}`)
          } else {
            updatedCount++
          }
        } else {
          // 即使没有embedding，也更新时间戳
          await supabase
            .from('knowledge_vectors')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', vector.id)
          updatedCount++
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (vectorError) {
        errors.push(`向量${vector.id}处理失败: ${vectorError}`)
      }
    }

    const message = `${documentType}向量更新完成: ${updatedCount}/${vectors.length} 条记录成功更新`
    
    return NextResponse.json({ 
      success: true, 
      message,
      updatedCount,
      totalCount: vectors.length,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error) {
    console.error('Error updating knowledge vectors:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '向量更新失败' },
      { status: 500 }
    )
  }
}

// 删除知识库记录的所有向量
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const documentType = searchParams.get('documentType')
    
    if (!documentId || !documentType) {
      return NextResponse.json(
        { error: '缺少documentId或documentType参数' },
        { status: 400 }
      )
    }

    if (!['abbreviation', 'script'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType必须是abbreviation或script' },
        { status: 400 }
      )
    }
    
    // 删除该文档的所有向量记录
    const { data: deletedVectors, error } = await supabase
      .from('knowledge_vectors')
      .delete()
      .eq('document_id', documentId)
      .eq('document_type', documentType)
      .select('id, vector_type')
    
    if (error) {
      throw new Error(`删除向量失败: ${error.message}`)
    }
    
    const deletedCount = deletedVectors?.length || 0
    const vectorTypes = deletedVectors?.map(v => v.vector_type).join(', ') || ''
    
    return NextResponse.json({ 
      success: true, 
      message: `${documentType}的所有向量已删除: ${deletedCount} 条记录 (类型: ${vectorTypes})`,
      deletedCount
    })
    
  } catch (error) {
    console.error('Error deleting knowledge vectors:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '向量删除失败' },
      { status: 500 }
    )
  }
} 