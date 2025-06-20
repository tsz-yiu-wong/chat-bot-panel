// 机器人人设向量化服务
// 独立的人设向量管理系统

import { BotPersonality } from '@/lib/types/bot-personality'

// 向量化机器人人设数据
export async function updateBotPersonalityVectors(
  botId: string,
  personalityData: BotPersonality
) {
  try {
    const response = await fetch('/api/bot-personality/vectorize', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botId,
        personalityData
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '人设向量更新失败')
    }

    const result = await response.json()
    console.log('人设向量更新成功:', result.message)
    return result
  } catch (error) {
    console.error('Error updating bot personality vectors:', error)
    throw error
  }
}

// 删除机器人人设向量
export async function deleteBotPersonalityVectors(botId: string) {
  try {
    const response = await fetch(`/api/bot-personality/vectorize?botId=${botId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '人设向量删除失败')
    }

    const result = await response.json()
    console.log('人设向量删除成功:', result.message)
    return result
  } catch (error) {
    console.error('Error deleting bot personality vectors:', error)
    throw error
  }
}

// 搜索相似的机器人人设
export async function searchSimilarPersonalities(
  query: string,
  options: {
    limit?: number
    similarity_threshold?: number
    vector_type?: 'basic_info' | 'personality' | 'experiences' | 'preferences' | 'comprehensive'
    exclude_bot_id?: string
  } = {}
) {
  try {
    const response = await fetch('/api/bot-personality/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        ...options
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '人设搜索失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error searching similar personalities:', error)
    throw error
  }
}

// 获取机器人的相似人设推荐
export async function getSimilarPersonalityRecommendations(
  botId: string,
  limit: number = 5
) {
  try {
    const response = await fetch(`/api/bot-personality/similar/${botId}?limit=${limit}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '获取相似人设推荐失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error getting similar personality recommendations:', error)
    throw error
  }
}

// 批量向量化现有人设数据
export async function vectorizeExistingPersonalities() {
  try {
    const response = await fetch('/api/bot-personality/vectorize-batch', {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '批量向量化失败')
    }

    const result = await response.json()
    console.log('批量向量化完成:', result.message)
    return result
  } catch (error) {
    console.error('Error vectorizing existing personalities:', error)
    throw error
  }
}

// 获取机器人的向量统计信息
export async function getBotVectorStats(botId: string) {
  try {
    const response = await fetch(`/api/bot-personality/vectors/${botId}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '获取向量统计失败')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error getting bot vector stats:', error)
    throw error
  }
}

/**
 * 更新机器人人设向量
 */
export async function updatePersonalityVectors(
  botId: string, 
  personalityData: BotPersonality,
  language: string = 'zh'
): Promise<{ success: boolean; message: string; errors?: string[] }> {
  try {
    const response = await fetch('/api/bot-personality/vectorize', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        botId, 
        personalityData,
        language 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '向量化失败');
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || '向量化完成',
      errors: result.errors
    };
  } catch (error) {
    console.error('Error updating personality vectors:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '向量化失败'
    };
  }
} 