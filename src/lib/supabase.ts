import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Bot {
  bot_id: string
  name: string
  persona_description: string
  system_prompt_template: string
  created_at: string
  updated_at: string
}

export interface User {
  user_id: string
  external_user_id: string
  created_at: string
  updated_at: string
}

export interface UserTag {
  tag_id: string
  tag_name: string
}

export interface Prompt {
  prompt_id: string
  bot_id?: string
  stage_name: string
  prompt_text_template: string
  conditions: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ChatHistory {
  message_id: string
  session_id: string
  user_id: string
  bot_id: string
  sender_type: 'user' | 'bot'
  message_text: string
  timestamp: string
  chat_stage: string
  metadata: Record<string, any>
}

export interface ChatEmbedding {
  embedding_id: string
  message_id: string
  embedding_vector: number[]
  text_content_hash?: string
  created_at: string
} 