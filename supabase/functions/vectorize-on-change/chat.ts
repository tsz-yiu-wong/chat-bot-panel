import { supabaseAdmin, generateEmbedding } from './utils.ts';

// =================================================================
// Multilingual Labels for Chat Vectorization
// =================================================================
const VECTORIZATION_LABELS = {
  zh: {
    user_prefix: "我说：",
    assistant_prefix: "你说：",
    topic_prefix: "你问："
  },
  en: {
    user_prefix: "I say: ",
    assistant_prefix: "You say: ",
    topic_prefix: "You ask: "
  },
  vi: {
    user_prefix: "Tôi nói: ",
    assistant_prefix: "Bạn nói: ",
    topic_prefix: "Bạn hỏi: "
  },
};

/**
 * Handles vectorization for the 'chat_messages' table.
 * It traverses backwards from the new message until it finds a processed message,
 * then vectorizes the entire unprocessed conversational chunk.
 */
export async function handleChatMessage(record: Record<string, any>) {
  console.log(`[chat_messages:${record.id}] Received trigger for message.`);
  // We only trigger this process for new 'assistant' messages.
  if (record.role !== 'assistant') {
    console.log(`[chat_messages:${record.id}] Message role is '${record.role}', not 'assistant'. Skipping.`);
    return;
  }

  // 1. Get session language
  console.log(`[chat_messages:${record.id}] Fetching session ${record.session_id} to get language.`);
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('chat_sessions')
    .select('language')
    .eq('id', record.session_id)
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to fetch session ${record.session_id}: ${sessionError?.message}`);
  }
  const language = (session.language || 'en') as keyof typeof VECTORIZATION_LABELS;
  const labels = VECTORIZATION_LABELS[language] || VECTORIZATION_LABELS.en;

  // 2. Fetch all messages in the session older than the current one
  const { data: olderMessages, error: olderMessagesError } = await supabaseAdmin
    .from('chat_messages')
    .select('id, role, content, is_processed')
    .eq('session_id', record.session_id)
    .lt('created_at', record.created_at)
    .order('created_at', { ascending: false });

  if (olderMessagesError) {
    throw new Error(`Failed to fetch older messages: ${olderMessagesError.message}`);
  }

  // 3. Gather the conversational chunk to be vectorized
  const conversationChunk = [record];
  for (const msg of olderMessages) {
    if (msg.is_processed) {
      break; // Stop when we hit an already processed message
    }
    conversationChunk.unshift(msg); // Add to the beginning to maintain chronological order
  }

  // 4. Build the combined content string for vectorization
  const contentToVectorize = conversationChunk.map(msg => {
    switch (msg.role) {
      case 'user':
        return `${labels.user_prefix}${msg.content}`;
      case 'assistant':
        return `${labels.assistant_prefix}${msg.content}`;
      case 'topic': // Assuming 'topic' is a possible role for system-initiated messages
        return `${labels.topic_prefix}${msg.content}`;
      default:
        return msg.content;
    }
  }).join('\n');

  console.log(`[chat_messages:${record.id}] Constructed content from ${conversationChunk.length} messages for vectorization.`);

  // 5. Generate embedding
  const embedding = await generateEmbedding(contentToVectorize);

  // 6. Upsert the new vector, associating it with the latest assistant message
  console.log(`[chat_messages:${record.id}] Upserting vector...`);
  const { error: upsertError } = await supabaseAdmin.from('chat_message_vectors').upsert({
    message_id: record.id,
    session_id: record.session_id,
    content: contentToVectorize,
    embedding: embedding,
    language: session.language,
    vector_type: 'message_context',
  }, { onConflict: 'message_id' });

  if (upsertError) {
    console.error(`[chat_messages:${record.id}] Failed to upsert chat vector:`, upsertError);
    throw new Error(`Failed to upsert chat vector: ${upsertError.message}`);
  }

  console.log(`[chat_messages:${record.id}] Successfully upserted chat vector.`);

  // 7. Mark all messages in the chunk as processed
  const messageIdsToUpdate = conversationChunk.map(msg => msg.id);
  const { error: updateError } = await supabaseAdmin
    .from('chat_messages')
    .update({ is_processed: true })
    .in('id', messageIdsToUpdate);

  if (updateError) {
    // This is not a fatal error for the vectorization itself, but should be logged.
    console.error(`Failed to mark messages as processed: ${updateError.message}`);
  }
}
