// 知识库搜索结果类型
export interface KnowledgeSearchResult {
  id: string | number;
  title: string;
  content: string;
  type: 'script' | 'abbreviation' | 'knowledge' | undefined;
  similarity: number;
}

// 知识库搜索响应类型
export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

// LLM使用统计类型
export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// 会话元数据类型
export interface SessionMetadata {
  llm_model?: string;
  llm_usage?: LLMUsage;
  merged_messages_count?: number;
  processed_at?: string;
  knowledge_search_threshold?: number;
  knowledge_context_length?: number;
  knowledge_results_count?: number;
  knowledge_max_similarity?: number;
  personality_similarity?: number;
  abbreviations_found?: number;
  history_limit?: number;
  prompt_id?: string;
  personality_id?: string;
  received_at?: string;
  language?: 'zh' | 'vi';
  [key: string]: unknown;
} 