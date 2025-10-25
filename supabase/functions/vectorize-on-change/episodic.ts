import { supabaseAdmin, generateEmbedding } from './utils.ts';

/**
 * Handles vectorization for the 'chat_users_episodic_memories' table.
 * 
 * 策略：直接对 content 字段进行向量化
 * - content 包含完整的事件描述（50-200字），用于向量化和展示
 * - 向量化后更新 embedding 字段
 */
export async function handleEpisodicMemory(record: Record<string, any>) {
  console.log(`[episodic:${record.id}] Starting vectorization for episodic memory.`);

  // 验证必要字段
  if (!record.content || record.content.trim().length === 0) {
    console.warn(`[episodic:${record.id}] Content is empty, skipping vectorization.`);
    return;
  }

  // 生成向量
  console.log(`[episodic:${record.id}] Generating embedding for content: "${record.content.substring(0, 50)}..."`);
  const embedding = await generateEmbedding(record.content);

  // 更新数据库中的 embedding 字段
  console.log(`[episodic:${record.id}] Updating embedding in database...`);
  const { error } = await supabaseAdmin
    .from('chat_users_episodic_memories')
    .update({ 
      embedding: embedding,
      updated_at: new Date().toISOString() // 更新时间戳
    })
    .eq('id', record.id);

  if (error) {
    console.error(`[episodic:${record.id}] Failed to update episodic memory embedding:`, error);
    throw new Error(`Failed to update episodic memory embedding: ${error.message}`);
  }

  console.log(`[episodic:${record.id}] Successfully vectorized episodic memory.`);
}

