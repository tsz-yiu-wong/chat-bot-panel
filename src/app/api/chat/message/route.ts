import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { llmService } from '@/lib/llm-service';
import crypto from 'crypto';
import { KnowledgeSearchResult, KnowledgeSearchResponse, SessionMetadata } from '@/lib/types/knowledge';

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

// 内部向量搜索函数
async function searchKnowledgeBase(query: string, similarity_threshold: number = 0.5, limit: number = 5) {
  try {
    const supabase = createSupabaseServer();
    
    // 生成查询向量
    const queryEmbedding = await llmService.generateEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.log('无法生成查询向量');
      return { results: [] };
    }

    // 获取所有向量数据
    const { data: vectors, error: vectorError } = await supabase
      .from('knowledge_vectors')
      .select('*');

    if (vectorError) {
      console.error('获取向量数据失败:', vectorError);
      return { results: [] };
    }

    if (!vectors || vectors.length === 0) {
      console.log('知识库中没有向量数据');
      return { results: [] };
    }

    // 计算相似度并排序
    const results = [];
    for (const vector of vectors) {
      try {
        let embedding: number[];
        
        if (vector.embedding) {
          if (typeof vector.embedding === 'string') {
            try {
              embedding = JSON.parse(vector.embedding);
            } catch {
              continue;
            }
          } else if (Array.isArray(vector.embedding)) {
            embedding = vector.embedding;
          } else {
            continue;
          }
        } else {
          continue;
        }

        if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
          continue;
        }

        // 计算余弦相似度
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        if (similarity >= similarity_threshold) {
          // 获取对应的文档内容
          let content, title, type: 'script' | 'abbreviation' | 'knowledge' | undefined;
          
          if (vector.document_type === 'abbreviation') {
            const { data: abbr } = await supabase
              .from('knowledge_abbreviations')
              .select('abbreviation, full_form, description, category')
              .eq('id', vector.document_id)
              .single();
              
            if (abbr) {
              title = `${abbr.abbreviation} - ${abbr.full_form}`;
              content = `缩写: ${abbr.abbreviation} | 完整形式: ${abbr.full_form}${abbr.description ? ` | 描述: ${abbr.description}` : ''}`;
              type = 'abbreviation';
            }
          } else if (vector.document_type === 'script') {
            const { data: script } = await supabase
              .from('knowledge_scripts')
              .select('text, answer, scenario')
              .eq('id', vector.document_id)
              .single();
              
            if (script) {
              title = `${script.scenario} - 话术`;
              content = `用户: ${script.text} | 回答: ${script.answer}`;
              type = 'script';
            }
          }
          
          if (title && content) {
            results.push({
              id: vector.document_id,
              title,
              content,
              type,
              similarity
            });
          }
        }
      } catch (err) {
        console.error(`处理向量 ${vector.document_id} 时出错:`, err);
        continue;
      }
    }

    // 按相似度排序并限制结果数量
    results.sort((a, b) => b.similarity - a.similarity);
    return { results: results.slice(0, limit) };
    
  } catch (error) {
    console.error('知识库搜索失败:', error);
    return { results: [] };
  }
}

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// POST - 发送消息（不立即处理，等待批量处理）
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { session_id, content, user_id } = await request.json();

    if (!session_id || !content) {
      return NextResponse.json({ error: '会话ID和消息内容不能为空' }, { status: 400 });
    }

    // 验证会话存在
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('is_deleted', false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 400 });
    }

    // 存储用户消息（标记为未处理）
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        user_id: user_id || session.user_id,
        role: 'user',
        content,
        is_processed: false,
        metadata: {
          received_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 更新会话的最后消息时间
    await supabase
      .from('chat_sessions')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    return NextResponse.json({ 
      message,
      status: 'queued',
      info: '消息已接收，等待处理'
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - 获取会话消息历史
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!sessionId) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    // 获取消息历史
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        chat_users(id, username, display_name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取会话信息
    const { data: session } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        chat_users(id, username, display_name),
        bot_personalities(id, bot_name)
      `)
      .eq('id', sessionId)
      .single();

    return NextResponse.json({ 
      messages,
      session,
      pagination: {
        limit,
        offset,
        total: messages?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - 批量处理待处理消息
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { 
      session_id, 
      force = false,
      similarity_threshold = 0.5,
      history_limit = 10,
    } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    // 获取会话信息
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        bot_personalities(*)
      `)
      .eq('id', session_id)
      .eq('is_deleted', false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 400 });
    }

    // 检查是否需要处理消息
    if (!force) {
      const timeSinceLastMessage = session.last_message_at 
        ? Date.now() - new Date(session.last_message_at).getTime()
        : 0;
      const mergeThreshold = session.message_merge_seconds * 1000;

      if (timeSinceLastMessage < mergeThreshold) {
        return NextResponse.json({ 
          message: '还未到消息合并时间',
          waitTime: Math.ceil((mergeThreshold - timeSinceLastMessage) / 1000)
        });
      }
    }

    // 获取未处理的用户消息
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', session_id)
      .eq('role', 'user')
      .eq('is_processed', false)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages error:', messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ message: '没有待处理的消息' });
    }

    // 合并用户消息
    const mergedContent = pendingMessages
      .map(msg => msg.content)
      .join('\n\n');

    // **新增：向量检索相关知识库内容**
    let knowledgeContext = '';
    let searchResponse: KnowledgeSearchResponse = { results: [] };
    try {
      // 调用向量搜索API获取相关知识
      searchResponse = await searchKnowledgeBase(mergedContent, similarity_threshold);

      if (searchResponse.results && searchResponse.results.length > 0) {
        console.log(`向量检索找到 ${searchResponse.results.length} 条相关内容`);
        
        // 检查是否有高相似度的话术匹配
        const veryHighSimilarityScripts = searchResponse.results.filter(
          (result: KnowledgeSearchResult) => result.type === 'script' && result.similarity >= 0.8
        );
        const highSimilarityScripts = searchResponse.results.filter(
          (result: KnowledgeSearchResult) => result.type === 'script' && result.similarity >= 0.6
        );

        if (veryHighSimilarityScripts.length > 0) {
          // 非常高相似度：直接使用话术回答
          const scriptAnswers = veryHighSimilarityScripts.map((result: KnowledgeSearchResult) => {
            const match = result.content.match(/回答:\s*(.+)$/);
            return match ? match[1] : result.content;
          });

          knowledgeContext = `

这是一个标准话术场景，相似度${veryHighSimilarityScripts[0].similarity.toFixed(3)}。
必须直接回答："${scriptAnswers[0]}"
不要添加任何解释、分析或额外内容，只需要输出这个标准回答。`;
        } else if (highSimilarityScripts.length > 0) {
          // 高相似度：强烈建议使用话术回答
          const scriptAnswers = highSimilarityScripts.map((result: KnowledgeSearchResult) => {
            const match = result.content.match(/回答:\s*(.+)$/);
            return match ? match[1] : result.content;
          });

          knowledgeContext = `

根据话术库，对于这类问题的标准回答是："${scriptAnswers[0]}"
请直接使用这个回答，保持简洁和一致性。`;
        } else {
          // 如果没有高相似度匹配，提供参考信息
          const knowledgeItems = searchResponse.results.slice(0, 3).map((result: KnowledgeSearchResult) => {
            if (result.type === 'script') {
              // 对于话术，提取用户问题和回答
              const userMatch = result.content.match(/用户:\s*([^|]+)/);
              const answerMatch = result.content.match(/回答:\s*(.+)$/);
              if (userMatch && answerMatch) {
                return `相似问题："${userMatch[1].trim()}" → 建议回答："${answerMatch[1].trim()}"`;
              }
            } else if (result.type === 'abbreviation') {
              return `相关信息：${result.content}`;
            }
            return result.content;
          }).join('\n');

          knowledgeContext = `

参考相关信息：
${knowledgeItems}

请参考以上信息回答用户问题。如果有相似的问题和回答，可以参考其风格和内容。`;
        }
      } else {
        console.log('向量检索未找到相关内容');
      }
    } catch (searchError) {
      console.error('向量检索出错:', searchError);
      // 向量检索失败不应影响正常对话，继续处理
    }

    // 获取聊天历史（使用传入的history_limit参数）
    const { data: chatHistory } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('is_processed', true)
      .order('created_at', { ascending: false })
      .limit(history_limit);

    // 构建消息历史数组（用于LLM调用）
    const historyMessages = chatHistory 
      ? chatHistory.reverse().map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      : [];

    // 添加当前用户消息
    historyMessages.push({
      role: 'user',
      content: mergedContent
    });

    // 构建系统Prompt（包含知识库上下文）
    let systemPrompt = '你是一个有用的AI助手。';
    if (session.bot_personalities) {
      const personality = session.bot_personalities;
      systemPrompt = `你是${personality.bot_name}，一个AI聊天机器人。
      
个人信息：
- 姓名：${personality.bot_name}
- 性格：${personality.worldview || '友善、乐于助人'}
- 兴趣爱好：${personality.hobbies || '聊天、学习新知识'}

请保持角色设定，用友善和有帮助的方式回应用户。${knowledgeContext}`;
    } else {
      // 如果没有人设，至少要加上知识库上下文
      if (knowledgeContext) {
        systemPrompt += knowledgeContext;
      }
    }

    // 调用LLM生成回复
    const llmResponse = await llmService.chatWithHistory([
      { role: 'system', content: systemPrompt },
      ...historyMessages
    ]);

    if (!llmResponse.success) {
      throw new Error(`LLM调用失败: ${llmResponse.error}`);
    }

    // 生成合并组ID
    const mergeGroupId = crypto.randomUUID();

    // 存储AI回复
    const { data: aiMessage, error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        user_id: null,
        role: 'assistant',
        content: llmResponse.content,
        is_processed: true,
        merge_group_id: mergeGroupId,
        metadata: {
          llm_model: llmResponse.model,
          llm_usage: llmResponse.usage,
          merged_messages_count: pendingMessages.length,
          processed_at: new Date().toISOString(),
          knowledge_search_threshold: similarity_threshold,
          knowledge_context_length: knowledgeContext.length,
          knowledge_results_count: searchResponse?.results?.length || 0,
          knowledge_max_similarity: searchResponse?.results?.length > 0 ? 
            Math.max(...searchResponse.results.map((r: KnowledgeSearchResult) => r.similarity)) : 0,
          history_limit: history_limit
        } as SessionMetadata
      })
      .select()
      .single();

    if (aiMessageError) {
      console.error('AI message error:', aiMessageError);
      return NextResponse.json({ error: aiMessageError.message }, { status: 500 });
    }

    // 标记用户消息为已处理
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        is_processed: true,
        merge_group_id: mergeGroupId,
        metadata: {
          ...pendingMessages[0].metadata,
          processed_at: new Date().toISOString()
        }
      })
      .eq('session_id', session_id)
      .eq('role', 'user')
      .eq('is_processed', false);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // 更新会话的最后处理时间
    await supabase
      .from('chat_sessions')
      .update({ 
        last_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    return NextResponse.json({
      success: true,
      message: '消息处理完成',
      aiMessage,
      processedCount: pendingMessages.length,
      mergeGroupId,
      knowledgeUsed: knowledgeContext.length > 0
    });

  } catch (error) {
    console.error('Error processing messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}