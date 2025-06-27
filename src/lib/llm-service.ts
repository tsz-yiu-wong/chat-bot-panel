import OpenAI from 'openai';

// LLM服务封装类
// 注意：模型选择由服务器端硬编码控制，前端不传递model参数
// 聊天功能使用本地服务器，embedding功能使用OpenAI
export class LLMService {
  private baseUrl: string;
  private apiKey?: string;
  private openai: OpenAI;

  constructor() {
    // 支持环境变量配置服务器地址，方便开发和部署
    this.baseUrl = process.env.LLM_SERVER_URL || 'http://localhost:8000';
    this.apiKey = process.env.CHAT_BOT_API_KEY;
    
    // 初始化OpenAI客户端用于embedding
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  // 聊天补全
  async chat(prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
  } = {}) {
    try {
      const {
        maxTokens = 2000,
        temperature = 0.7
      } = options;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const requestBody = {
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
      };

      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        model: data.model
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
  } = {}) {
    try {
      const {
        maxTokens = 2000,
        temperature = 0.7
      } = options;

      // 过滤掉不支持的角色类型，只保留 'user', 'assistant', 'system'
      const validMessages = messages.filter(msg => 
        ['user', 'assistant', 'system'].includes(msg.role)
      ).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const requestBody = {
        messages: validMessages,
        max_tokens: maxTokens,
        temperature,
      };

      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        model: data.model
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

  // 生成文本embedding (使用OpenAI API)
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
  llmTemperature: 0.7           // LLM温度参数
}; 