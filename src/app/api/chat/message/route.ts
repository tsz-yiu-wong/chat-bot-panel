import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { llmService } from '@/lib/llm-service';
import crypto from 'crypto';
import { KnowledgeSearchResult, KnowledgeSearchResponse, SessionMetadata } from '@/lib/types/knowledge';
import { getKnowledgeRetrievalConfig, getChatProcessingConfig } from '@/lib/config/ai-config';

// 动态获取基础URL的辅助函数
function getBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 在本地或其他环境中回退
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// 双语文本配置
const LANGUAGE_TEXTS = {
  zh: {
    personalityContext: (similarity: number) => `\n\n根据人设信息 (相似度: ${similarity.toFixed(3)}):\n`,
    abbreviationContext: '\n\n识别到的缩写:\n',
    highSimilarityScript: (similarity: number) => `\n\n这是标准话术场景 (相似度${similarity.toFixed(3)})，必须严格参考以下标准回答：\n"`,
    highSimilarityEnd: '"\n不要额外添加解释、分析或内容。',
    knowledgeReference: '\n\n参考相关信息：\n',
    knowledgeInstruction: '\n\n请参考以上信息回答用户问题。如果有相似的问题和回答，可以参考其风格和内容。',
    similarQuestion: '相似问题',
    suggestedAnswer: '建议回答',
    relatedInfo: '相关信息',
    defaultSystemPrompt: '你是一个有用的AI助手。',
    abbreviationPrefix: '缩写',
    fullFormPrefix: '完整形式',
    descriptionPrefix: '描述',
    scriptSuffix: '话术',
    userPrefix: '用户',
    answerPrefix: '回答'
  },
  vi: {
    personalityContext: (similarity: number) => `\n\nDựa trên thông tin nhân vật (độ tương tự: ${similarity.toFixed(3)}):\n`,
    abbreviationContext: '\n\nCác từ viết tắt được nhận dạng:\n',
    highSimilarityScript: (similarity: number) => `\n\nĐây là kịch bản chuẩn (độ tương tự ${similarity.toFixed(3)}), phải tham khảo nghiêm ngặt câu trả lời chuẩn sau:\n"`,
    highSimilarityEnd: '"\nKhông được thêm giải thích, phân tích hoặc nội dung bổ sung.',
    knowledgeReference: '\n\nTham khảo thông tin liên quan:\n',
    knowledgeInstruction: '\n\nVui lòng tham khảo thông tin trên để trả lời câu hỏi của người dùng. Nếu có câu hỏi và câu trả lời tương tự, có thể tham khảo phong cách và nội dung của chúng.',
    similarQuestion: 'Câu hỏi tương tự',
    suggestedAnswer: 'Câu trả lời đề xuất',
    relatedInfo: 'Thông tin liên quan',
    defaultSystemPrompt: 'Bạn là một trợ lý AI hữu ích.',
    abbreviationPrefix: 'Từ viết tắt',
    fullFormPrefix: 'Dạng đầy đủ',
    descriptionPrefix: 'Mô tả',
    scriptSuffix: 'Kịch bản',
    userPrefix: 'Người dùng',
    answerPrefix: 'Câu trả lời'
  }
};

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
async function searchKnowledgeBase(query: string, similarity_threshold?: number, limit?: number, language: 'zh' | 'vi' = 'zh') {
  try {
    const config = getKnowledgeRetrievalConfig();
    const actualThreshold = similarity_threshold ?? config.general_knowledge.similarity_threshold;
    const actualLimit = limit ?? config.general_knowledge.limit;
    const texts = LANGUAGE_TEXTS[language];
    
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
        
        if (similarity >= actualThreshold) {
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
              content = `${texts.abbreviationPrefix}: ${abbr.abbreviation} | ${texts.fullFormPrefix}: ${abbr.full_form}${abbr.description ? ` | ${texts.descriptionPrefix}: ${abbr.description}` : ''}`;
              type = 'abbreviation';
            }
          } else if (vector.document_type === 'script') {
            const { data: script } = await supabase
              .from('knowledge_scripts')
              .select('text, answer, scenario')
              .eq('id', vector.document_id)
              .single();
              
            if (script) {
              title = `${script.scenario} - ${texts.scriptSuffix}`;
              content = `${texts.userPrefix}: ${script.text} | ${texts.answerPrefix}: ${script.answer}`;
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
    return { results: results.slice(0, actualLimit) };
    
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
    const knowledgeConfig = getKnowledgeRetrievalConfig();
    const chatConfig = getChatProcessingConfig();
    
    const { 
      session_id, 
      force = false,
      history_limit = chatConfig.history_limit,  // 使用配置文件的默认值
      prompt_id,
      personality_id,
      language = 'zh' // 新增language参数，默认为中文
    } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: '会话ID不能为空' }, { status: 400 });
    }

    if (!prompt_id || !personality_id) {
      return NextResponse.json({ error: 'Prompt ID和人设ID不能为空' }, { status: 400 });
    }

    // 验证语言参数
    const selectedLanguage = (language === 'vi') ? 'vi' : 'zh';
    const texts = LANGUAGE_TEXTS[selectedLanguage];
    
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

    // 获取会话信息
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`*`)
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

    // **获取选择的prompt内容**
    const promptResponse = await fetch(`${getBaseUrl()}/api/prompts/${prompt_id}`);
    let systemPrompt = texts.defaultSystemPrompt;
    if (promptResponse.ok) {
      const promptData = await promptResponse.json();
      if (promptData.prompt) {
        // 根据语言选择不同的prompt字段
        const promptField = selectedLanguage === 'vi' ? 'prompt_vn' : 'prompt_cn';
        if (promptData.prompt[promptField]) {
          systemPrompt = promptData.prompt[promptField];
        } else if (promptData.prompt.prompt_cn) {
          // 如果没有对应语言的prompt，回退到中文
          systemPrompt = promptData.prompt.prompt_cn;
        } else {
          console.warn(`Prompt数据中没有找到${promptField}或prompt_cn字段`);
        }
      } else {
        console.warn(`Prompt响应中没有prompt字段`);
      }
    } else {
      console.error(`获取Prompt失败: ${promptResponse.status}`);
    }

    // **1. 人设向量检索**
    let personalityContext = '';
    try {
      const personalityResponse = await fetch(`${getBaseUrl()}/api/bot-personality/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mergedContent,
          include_bot_id: personality_id,
          similarity_threshold: knowledgeConfig.personality_matching.similarity_threshold,  // 使用配置
          limit: knowledgeConfig.personality_matching.limit  // 使用配置
        })
      });

      if (personalityResponse.ok) {
        const personalityData = await personalityResponse.json();
        if (personalityData.results && personalityData.results.length > 0) {
          const bestMatch = personalityData.results[0];
          personalityContext = texts.personalityContext(bestMatch.similarity) + bestMatch.content;
        }
      } else {
        console.error(`人设检索失败: ${personalityResponse.status}`);
      }
    } catch (error) {
      console.error('人设检索失败:', error);
    }

    // **2. 缩写检索和处理**
    let abbreviationContext = '';
    let foundAbbreviations: { content: string; similarity: number }[] = [];
    try {
      const abbreviationResponse = await fetch(`${getBaseUrl()}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mergedContent,
          document_type: 'abbreviation',
          similarity_threshold: knowledgeConfig.abbreviation_recognition.similarity_threshold,  // 使用配置
          limit: knowledgeConfig.abbreviation_recognition.limit,  // 使用配置
          language: selectedLanguage // 传递语言参数
        })
      });

      if (abbreviationResponse.ok) {
        const abbrData = await abbreviationResponse.json();
        if (abbrData.results && abbrData.results.length > 0) {
          // 按缩写分组，每个缩写只取最高相似度的
          const abbrGroups: { [key: string]: { content: string; similarity: number } } = {};
          abbrData.results.forEach((result: { content: string; similarity: number }) => {
            // 动态匹配缩写前缀，支持多语言
            const abbrMatch = result.content.match(new RegExp(`${texts.abbreviationPrefix}:\\s*([^|]+)`));
            if (abbrMatch) {
              const abbr = abbrMatch[1].trim();
              if (!abbrGroups[abbr] || result.similarity > abbrGroups[abbr].similarity) {
                abbrGroups[abbr] = result;
              }
            }
          });

          foundAbbreviations = Object.values(abbrGroups);
          if (foundAbbreviations.length > 0) {
            abbreviationContext = texts.abbreviationContext + foundAbbreviations.map(a => a.content).join('\n');
          }
        }
      } else {
        console.error(`缩写检索失败: ${abbreviationResponse.status}`);
      }
    } catch (error) {
      console.error('缩写检索失败:', error);
    }

    // **3. 话术库检索**
    let knowledgeContext = '';
    let searchResponse: KnowledgeSearchResponse = { results: [] };
    try {
      // 调用向量搜索API获取相关知识，传递语言参数
      searchResponse = await searchKnowledgeBase(
        mergedContent, 
        knowledgeConfig.script_library.similarity_threshold,  // 使用配置
        undefined, // 使用默认limit
        selectedLanguage // 传递语言参数
      );

      if (searchResponse.results && searchResponse.results.length > 0) {
        // 检查是否有高相似度的话术匹配
        const veryHighSimilarityScripts = searchResponse.results.filter(
          (result: KnowledgeSearchResult) => result.type === 'script' && result.similarity >= knowledgeConfig.script_library.force_use_threshold  // 使用配置
        );

        if (veryHighSimilarityScripts.length > 0) {
          // 高相似度：强力要求使用话术回答
          const scriptAnswers = veryHighSimilarityScripts.map((result: KnowledgeSearchResult) => {
            const match = result.content.match(new RegExp(`${texts.answerPrefix}:\\s*(.+)$`));
            return match ? match[1] : result.content;
          });

          knowledgeContext = texts.highSimilarityScript(veryHighSimilarityScripts[0].similarity) + 
                            scriptAnswers[0] + 
                            texts.highSimilarityEnd;
        } else {
          // 如果没有高相似度匹配，提供参考信息
          const knowledgeItems = searchResponse.results
            .filter((result: KnowledgeSearchResult) => result.type !== 'abbreviation') // 排除缩写类型，避免重复
            .slice(0, 3)
            .map((result: KnowledgeSearchResult) => {
              if (result.type === 'script') {
                // 对于话术，提取用户问题和回答
                const userMatch = result.content.match(new RegExp(`${texts.userPrefix}:\\s*([^|]+)`));
                const answerMatch = result.content.match(new RegExp(`${texts.answerPrefix}:\\s*(.+)$`));
                if (userMatch && answerMatch) {
                  return `${texts.similarQuestion}："${userMatch[1].trim()}" → ${texts.suggestedAnswer}："${answerMatch[1].trim()}"`;
                }
              }
              return result.content;
            })
            .filter(item => item) // 过滤掉空值
            .join('\n');

          if (knowledgeItems.trim()) {
            knowledgeContext = texts.knowledgeReference + knowledgeItems + texts.knowledgeInstruction;
          }
        }
      }
    } catch (searchError) {
      console.error('话术库检索失败:', searchError);
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

    // **构建最终的系统Prompt**
    const finalSystemPrompt = systemPrompt + personalityContext + abbreviationContext + knowledgeContext;
    
    // 调用LLM生成回复
    const llmResponse = await llmService.chatWithHistory([
      { role: 'system', content: finalSystemPrompt },
      ...historyMessages
    ]);

    if (!llmResponse.success) {
      throw new Error(`LLM调用失败: ${llmResponse.error}`);
    }

    // **缩写替换处理** - 对AI回复进行缩写替换
    let finalContent = llmResponse.content;
    if (foundAbbreviations.length > 0) {
      foundAbbreviations.forEach(abbr => {
        const fullFormMatch = abbr.content.match(new RegExp(`${texts.fullFormPrefix}:\\s*([^|]+)`));
        const abbrMatch = abbr.content.match(new RegExp(`${texts.abbreviationPrefix}:\\s*([^|]+)`));
        if (fullFormMatch && abbrMatch) {
          const fullForm = fullFormMatch[1].trim();
          const abbreviation = abbrMatch[1].trim();
          // 简单的替换逻辑，可以根据需要优化
          const regex = new RegExp(`\\b${fullForm}\\b`, 'gi');
          finalContent = finalContent.replace(regex, abbreviation);
        }
      });
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
        content: finalContent,
        is_processed: true,
        merge_group_id: mergeGroupId,
        metadata: {
          llm_model: llmResponse.model,
          llm_usage: llmResponse.usage,
          merged_messages_count: pendingMessages.length,
          processed_at: new Date().toISOString(),
          knowledge_search_threshold: knowledgeConfig.script_library.similarity_threshold,
          knowledge_context_length: knowledgeContext.length,
          knowledge_results_count: searchResponse?.results?.length || 0,
          knowledge_max_similarity: searchResponse?.results?.length > 0 ? 
            Math.max(...searchResponse.results.map((r: KnowledgeSearchResult) => r.similarity)) : 0,
          personality_similarity: personalityContext ? 
            (personalityContext.match(/相似度:\s*([\d.]+)/) ? parseFloat(personalityContext.match(/相似度:\s*([\d.]+)/)![1]) : 0) : 0,
          abbreviations_found: foundAbbreviations.length,
          history_limit: history_limit,
          prompt_id: prompt_id,
          personality_id: personality_id,
          language: selectedLanguage
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

    // **自动触发聊天向量化（不阻塞响应）**
    setImmediate(async () => {
      try {
        // 等待一小段时间确保数据库触发器已执行
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 检查是否创建了向量记录
        const { data: vectorCheck, error: checkError } = await supabase
          .from('chat_message_vectors')
          .select('id, vector_type')
          .eq('message_id', aiMessage.id);
          
        if (checkError) {
          console.error('检查向量记录失败:', checkError);
          return;
        }
        
        if (!vectorCheck || vectorCheck.length === 0) {
          // 手动调用批量向量化作为备用方案
          const batchResponse = await fetch(`${getBaseUrl()}/api/chat/vectors/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: session_id,
              limit: 1
            })
          });
          
          if (batchResponse.ok) {
            const batchResult = await batchResponse.json();
            console.log('备用向量化完成:', batchResult.message);
          } else {
            console.error('备用向量化失败:', await batchResponse.text());
          }
          return;
        }
        
        // 为新创建的向量生成embedding
        const vectorizeResponse = await fetch(`${getBaseUrl()}/api/chat/vectors`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session_id,
            batch_size: 5  // 限制批量大小，确保及时处理
          })
        });

        if (vectorizeResponse.ok) {
          const result = await vectorizeResponse.json();
          if (result.updated_count > 0) {
            console.log(`向量化完成: ${result.updated_count} 个向量`);
          }
        } else {
          console.error('向量化失败:', await vectorizeResponse.text());
        }
      } catch (vectorizeError) {
        console.error('向量化调用失败:', vectorizeError);
      }
    });

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