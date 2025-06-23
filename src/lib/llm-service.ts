import OpenAI from 'openai';

// LLM服务封装类
export class LLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  // 聊天补全
  async chat(prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  } = {}) {
    try {
      const {
        maxTokens = 2000,
        temperature = 0.7,
        model = 'gpt-3.5-turbo'
      } = options;

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('LLM service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: ''
      };
    }
  }

  // 基于消息历史的对话
  async chatWithHistory(messages: Array<{role: string, content: string}>, options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  } = {}) {
    try {
      const {
        maxTokens = 2000,
        temperature = 0.7,
        model = 'gpt-3.5-turbo'
      } = options;

      // 过滤掉OpenAI不支持的角色类型，只保留 'user', 'assistant', 'system'
      const validMessages = messages.filter(msg => 
        ['user', 'assistant', 'system'].includes(msg.role)
      ).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      const response = await this.openai.chat.completions.create({
        model,
        messages: validMessages,
        max_tokens: maxTokens,
        temperature,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('LLM service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: ''
      };
    }
  }

  // 生成文本embedding
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return [];
    }
  }
}

// 单例实例
export const llmService = new LLMService();

// 默认设置
export const DEFAULT_LLM_SETTINGS = {
  messageMergeSeconds: 300,      // 5分钟
  topicTriggerHours: 24,         // 24小时
  maxChatHistory: 10,            // 最多10条历史
  knowledgeSearchLimit: 5,       // 最多5条知识库结果
  llmMaxTokens: 2000,           // LLM最大Token数
  llmTemperature: 0.7,          // LLM温度参数
  llmModel: 'gpt-3.5-turbo'     // 默认模型
}; 