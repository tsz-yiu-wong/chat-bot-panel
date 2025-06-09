// 客户端向量化服务 - 通过API调用

// 存储文档向量
export async function storeDocumentVector(
  documentId: string,
  content: string,
  metadata: {
    title?: string
    category?: string
    scenario?: string
    abbreviation?: string
    full_form?: string
    type: 'document' | 'script' | 'abbreviation'
  }
) {
  try {
    const response = await fetch('/api/vectorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        content,
        metadata
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '向量存储失败')
    }

    const result = await response.json()
    console.log(result.message)
  } catch (error) {
    console.error('Error storing document vector:', error)
    throw error
  }
}

// 删除文档向量
export async function deleteDocumentVector(
  documentId: string, 
  documentType?: 'document' | 'script' | 'abbreviation'
) {
  try {
    const response = await fetch(`/api/vectorize?documentId=${documentId}&documentType=${documentType}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '向量删除失败')
    }

    const result = await response.json()
    console.log(result.message)
  } catch (error) {
    console.error('Error deleting document vector:', error)
    throw error
  }
}

// 搜索相似文档
export async function searchSimilarDocuments(
  query: string,
  limit: number = 5,
  similarity_threshold: number = 0.5
) {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
        similarity_threshold
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '搜索失败')
    }

    const result = await response.json()
    return result.results || []
  } catch (error) {
    console.error('Error searching similar documents:', error)
    throw error
  }
} 