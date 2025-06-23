// AI 相关配置文件
// 统一管理所有向量检索、相似度阈值和AI回复相关的参数

export interface VectorSearchConfig {
  // 向量检索基础配置
  similarity_threshold: number;  // 相似度阈值
  limit: number;                // 返回结果数量 (Top-K)
  vector_type: 'message' | 'context';  // 向量类型
  include_context: boolean;     // 是否包含上下文向量
}

export interface KnowledgeRetrievalConfig {
  // 知识库检索配置
  personality_matching: {
    similarity_threshold: number;
    limit: number;
  };
  abbreviation_recognition: {
    similarity_threshold: number;
    limit: number;
  };
  script_library: {
    similarity_threshold: number;
    limit: number;
    force_use_threshold: number;  // 强制使用话术的阈值
  };
  general_knowledge: {
    similarity_threshold: number;
    limit: number;
  };
}

export interface ChatProcessingConfig {
  // 聊天处理配置
  message_merge_seconds: number;    // 消息合并等待时间
  topic_trigger_hours: number;     // 话题触发间隔
  history_limit: number;           // 历史消息数量限制
  batch_size: number;              // 批量处理大小
  embedding_delay_ms: number;      // 向量生成延迟（避免API限制）
}

export interface AIConfig {
  // 完整的AI配置
  vector_search: VectorSearchConfig;
  knowledge_retrieval: KnowledgeRetrievalConfig;
  chat_processing: ChatProcessingConfig;
}

// 默认配置 - 平衡模式
export const DEFAULT_AI_CONFIG: AIConfig = {
  // 向量检索配置
  vector_search: {
    similarity_threshold: 0.6,    // 中等相似度阈值
    limit: 5,                     // 返回5条结果
    vector_type: 'message',       // 默认搜索消息向量
    include_context: false        // 不包含上下文向量
  },

  // 知识库检索配置
  knowledge_retrieval: {
    // 人设匹配 (宽松匹配，寻找相关特征)
    personality_matching: {
      similarity_threshold: 0.2,
      limit: 1
    },
    
    // 缩写识别 (中等严格度)
    abbreviation_recognition: {
      similarity_threshold: 0.3,
      limit: 10
    },
    
    // 话术库检索
    script_library: {
      similarity_threshold: 0.4,   // 基础检索阈值
      limit: 5,
      force_use_threshold: 0.7     // 强制使用话术的高阈值
    },
    
    // 通用知识检索
    general_knowledge: {
      similarity_threshold: 0.5,
      limit: 5
    }
  },

  // 聊天处理配置
  chat_processing: {
    message_merge_seconds: 30,     // 30秒消息合并时间
    topic_trigger_hours: 24,      // 24小时话题触发间隔
    history_limit: 10,            // 10条历史消息
    batch_size: 10,               // 批量处理10条
    embedding_delay_ms: 100       // 100ms延迟避免API限制
  }
};

// 预设配置方案
export const AI_CONFIG_PRESETS = {
  // 保守模式 - 高精度，低召回
  conservative: {
    ...DEFAULT_AI_CONFIG,
    vector_search: {
      ...DEFAULT_AI_CONFIG.vector_search,
      similarity_threshold: 0.8,
      limit: 3
    },
    knowledge_retrieval: {
      ...DEFAULT_AI_CONFIG.knowledge_retrieval,
      personality_matching: { similarity_threshold: 0.3, limit: 1 },
      abbreviation_recognition: { similarity_threshold: 0.4, limit: 5 },
      script_library: {
        similarity_threshold: 0.6,
        limit: 3,
        force_use_threshold: 0.8
      },
      general_knowledge: { similarity_threshold: 0.6, limit: 3 }
    }
  } as AIConfig,

  // 宽松模式 - 低精度，高召回
  liberal: {
    ...DEFAULT_AI_CONFIG,
    vector_search: {
      ...DEFAULT_AI_CONFIG.vector_search,
      similarity_threshold: 0.4,
      limit: 10
    },
    knowledge_retrieval: {
      ...DEFAULT_AI_CONFIG.knowledge_retrieval,
      personality_matching: { similarity_threshold: 0.1, limit: 2 },
      abbreviation_recognition: { similarity_threshold: 0.2, limit: 15 },
      script_library: {
        similarity_threshold: 0.3,
        limit: 8,
        force_use_threshold: 0.6
      },
      general_knowledge: { similarity_threshold: 0.3, limit: 8 }
    }
  } as AIConfig,

  // 平衡模式 (默认)
  balanced: DEFAULT_AI_CONFIG
};

// 获取当前配置的函数
let currentConfig: AIConfig = DEFAULT_AI_CONFIG;

export function getAIConfig(): AIConfig {
  return currentConfig;
}

export function setAIConfig(config: Partial<AIConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    vector_search: { ...currentConfig.vector_search, ...config.vector_search },
    knowledge_retrieval: { ...currentConfig.knowledge_retrieval, ...config.knowledge_retrieval },
    chat_processing: { ...currentConfig.chat_processing, ...config.chat_processing }
  };
}

export function resetAIConfig(): void {
  currentConfig = DEFAULT_AI_CONFIG;
}

export function loadPreset(presetName: keyof typeof AI_CONFIG_PRESETS): void {
  currentConfig = AI_CONFIG_PRESETS[presetName];
}

// 便捷的配置获取函数
export function getVectorSearchConfig(): VectorSearchConfig {
  return getAIConfig().vector_search;
}

export function getKnowledgeRetrievalConfig(): KnowledgeRetrievalConfig {
  return getAIConfig().knowledge_retrieval;
}

export function getChatProcessingConfig(): ChatProcessingConfig {
  return getAIConfig().chat_processing;
} 