import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// 搜索相似文档
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5, similarity_threshold = 0.1, document_type } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { error: '缺少查询参数' },
        { status: 400 }
      )
    }

    // 1. 生成查询向量
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // 2. 在数据库中搜索相似向量，根据document_type过滤
    let vectorQuery = supabase.from('knowledge_vectors').select('*')
    
    // 如果指定了document_type，则过滤
    if (document_type && ['abbreviation', 'script'].includes(document_type)) {
      vectorQuery = vectorQuery.eq('document_type', document_type)
    }
    
    const { data: vectors, error: vectorError } = await vectorQuery

    if (vectorError) throw vectorError

    // 3. 计算相似度并排序
    const results = []
    let processed = 0
    
    // 移除详细的进度日志，只在开发环境下输出
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.log(`开始处理 ${vectors.length} 个向量，查询: "${query}"，阈值: ${similarity_threshold}${document_type ? `，文档类型: ${document_type}` : ''}`)
    }
    
    for (const vector of vectors) {
      try {
        processed++
        // 解析向量数据
        let embedding: number[]
        
        // 从embedding字段读取向量数据
        if (vector.embedding) {
          // 如果是字符串格式（JSON），解析它
          if (typeof vector.embedding === 'string') {
            try {
              embedding = JSON.parse(vector.embedding)
            } catch {
              // 如果解析失败，可能是pgvector原生格式，跳过此向量
              // 移除重复的警告日志
              continue
            }
          } else if (Array.isArray(vector.embedding)) {
            embedding = vector.embedding
          } else {
            // 移除格式不支持的警告日志
            continue
          }
        } else {
          // 移除没有embedding数据的警告日志
          continue
        }

        // 验证向量维度
        if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
          // 移除维度不匹配的警告日志
          continue
        }

        // 计算余弦相似度
        const similarity = cosineSimilarity(queryEmbedding, embedding)
        
        if (similarity >= similarity_threshold) {
          // 获取对应的文档或话术内容
          let content, title, type, metadata = vector.metadata || {}
          
          if (vector.document_type === 'abbreviation') {
            const { data: abbr, error: abbrError } = await supabase
              .from('knowledge_abbreviations')
              .select('abbreviation, full_form, description, category')
              .eq('id', vector.document_id)
              .single()
              
            if (abbrError) {
              if (isDev) console.error(`获取缩写数据失败 ${vector.document_id}:`, abbrError)
              continue
            }
              
            if (abbr) {
              title = `${abbr.abbreviation} - ${abbr.full_form}`
              content = `缩写: ${abbr.abbreviation} | 完整形式: ${abbr.full_form}${abbr.description ? ` | 描述: ${abbr.description}` : ''}`
              type = 'abbreviation'
              metadata = { ...metadata, category: abbr.category, abbreviation: abbr.abbreviation, full_form: abbr.full_form }
            }
          } else if (vector.document_type === 'script') {
            const { data: script, error: scriptError } = await supabase
              .from('knowledge_scripts')
              .select('text, answer, scenario')
              .eq('id', vector.document_id)
              .single()
              
            if (scriptError) {
              if (isDev) console.error(`获取话术数据失败 ${vector.document_id}:`, scriptError)
              continue
            }
              
            if (script) {
              title = `${script.scenario} - 话术`
              content = `用户: ${script.text} | 回答: ${script.answer}`
              type = 'script'
              metadata = { ...metadata, scenario: script.scenario }
            }
          } else if (vector.document_type === 'document') {
            const { data: doc, error: docError } = await supabase
              .from('knowledge_documents')
              .select('title, content')
              .eq('id', vector.document_id)
              .single()
              
            if (docError) {
              if (isDev) console.error(`获取文档数据失败 ${vector.document_id}:`, docError)
              continue
            }
              
            if (doc) {
              title = doc.title
              content = doc.content
              type = 'document'
            }
          }
          
          if (title && content) {
            results.push({
              id: vector.document_id,
              title,
              content,
              type,
              similarity,
              metadata
            })
          }
        }
      } catch (err) {
        if (isDev) console.error(`处理向量 ${vector.document_id} 时出错:`, err)
        continue
      }
    }

    // 只在开发环境或有结果时输出统计信息
    if (isDev || results.length > 0) {
      console.log(`向量检索完成: 检查了 ${processed} 个向量，找到 ${results.length} 个匹配结果`)
    }

    // 4. 按相似度排序并限制结果数量
    results.sort((a, b) => b.similarity - a.similarity)
    const limitedResults = results.slice(0, limit)

    return NextResponse.json({ 
      success: true, 
      results: limitedResults,
      query_embedding_length: queryEmbedding.length,
      total_vectors_checked: vectors.length,
      debug: {
        similarity_threshold,
        query,
        document_type: document_type || 'all',
        found_above_threshold: results.length
      }
    })

  } catch (error) {
    console.error('Error searching similar documents:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    )
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度不匹配')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// 获取向量统计信息（调试用）
export async function GET() {
  try {
    console.log('开始获取向量统计信息...')
    
    // 先测试基本连接
    const { data: testData, error: testError } = await supabase
      .from('knowledge_vectors')
      .select('count', { count: 'exact' })
    
    if (testError) {
      console.error('数据库连接测试失败:', testError)
      throw testError
    }
    
    console.log('数据库连接成功，向量表记录数:', testData)
    
    const { data: vectors, error } = await supabase
      .from('knowledge_vectors')
      .select('document_id, document_type, metadata, embedding')
      .limit(5)
      
    if (error) {
      console.error('查询向量数据失败:', error)
      throw error
    }

    console.log('查询到向量数据:', vectors?.length)

    const stats = {
      total_vectors: testData?.length || 0,
      by_type: {} as Record<string, number>,
      sample_data: vectors?.slice(0, 3).map(v => ({
        document_id: v.document_id,
        document_type: v.document_type,
        metadata: v.metadata,
        has_embedding: !!v.embedding,
        embedding_type: typeof v.embedding,
        embedding_preview: v.embedding ? (typeof v.embedding === 'string' ? v.embedding.substring(0, 100) + '...' : 'Array') : null
      })) || []
    }

    vectors?.forEach(v => {
      stats.by_type[v.document_type] = (stats.by_type[v.document_type] || 0) + 1
    })

    console.log('统计信息生成成功:', stats)
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('Error getting vector stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取统计信息失败', details: error },
      { status: 500 }
    )
  }
} 