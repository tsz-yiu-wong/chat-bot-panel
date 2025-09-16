import { supabaseAdmin, generateEmbedding } from './utils.ts';

// =================================================================
// Multilingual Labels for Knowledge Vectorization
// =================================================================
const VECTORIZATION_LABELS = {
  zh: {
    abbreviation_prefix: "缩写：",
    full_form_prefix: "全称：",
    description_prefix: "描述：",
    user_text_prefix: "如果我提及：",
    answer_text_prefix: "你要回答：",
  },
  en: {
    abbreviation_prefix: "Abbreviation: ",
    full_form_prefix: "Full Form: ",
    description_prefix: "Description: ",
    user_text_prefix: "If I mention: ",
    answer_text_prefix: "You need to answer: ",
  },
  vi: {
    abbreviation_prefix: "Viết tắt: ",
    full_form_prefix: "Dạng đầy đủ: ",
    description_prefix: "Mô tả: ",
    user_text_prefix: "Nếu tôi đề cập: ",
    answer_text_prefix: "Bạn cần trả lời: ",
  },
};


/**
 * Handles vectorization for the 'knowledge_items' table.
 */
export async function handleKnowledgeItem(record: Record<string, any>) {
  let contentToVectorize = '';
  let vectorType = '';
  const language = (record.language || 'en') as keyof typeof VECTORIZATION_LABELS;
  const labels = VECTORIZATION_LABELS[language] || VECTORIZATION_LABELS.en;

  if (record.knowledge_type === 'abbreviation') {
    contentToVectorize = `${labels.abbreviation_prefix}${record.abbreviation}. ${labels.full_form_prefix}${record.full_form}. ${labels.description_prefix}${record.description || ''}`;
    vectorType = 'abbreviation';
  } else if (record.knowledge_type === 'script') {
    contentToVectorize = `${labels.user_text_prefix}${record.user_text}. ${labels.answer_text_prefix}${record.answer_text}`;
    vectorType = 'script';
  } else {
    console.warn(`Unrecognized knowledge_type: '${record.knowledge_type}' for item_id: ${record.id}. Skipping.`);
    return; // Do nothing if type is not recognized
  }

  console.log(`[knowledge_items:${record.id}] Constructed content for vectorization:`);
  console.log(contentToVectorize);

  const embedding = await generateEmbedding(contentToVectorize);

  const vectorData = {
    item_id: record.id,
    content: contentToVectorize,
    language: record.language,
    embedding: embedding,
    vector_type: vectorType,
    search_weight: 1.0,
  };

  console.log(`[knowledge_items:${record.id}] Upserting vector...`);
  const { error } = await supabaseAdmin.from('knowledge_vectors').upsert(vectorData, { onConflict: 'item_id' });

  if (error) {
    console.error(`[knowledge_items:${record.id}] Failed to upsert knowledge vector:`, error);
    throw new Error(`Failed to upsert knowledge vector: ${error.message}`);
  }

  console.log(`[knowledge_items:${record.id}] Successfully upserted knowledge vector.`);
}
