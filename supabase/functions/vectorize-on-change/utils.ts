import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from 'https://esm.sh/openai@4';

// =================================================================
// Environment Variables and Clients
// =================================================================
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

if (!supabaseUrl || !supabaseAnonKey || !openAIApiKey) {
  throw new Error("Missing required environment variables for utils.");
}

export const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey);
const openai = new OpenAI({ apiKey: openAIApiKey });

// =================================================================
// Shared Vectorization Logic
// =================================================================

/**
 * Generates an embedding for the given content.
 * @param content The text to embed.
 * @returns The embedding vector.
 */
export async function generateEmbedding(content: string): Promise<number[]> {
  if (!content || content.trim().length === 0) {
    console.log("Content is empty, returning zero vector.");
    // Return a zero vector if content is empty, to avoid OpenAI API errors.
    return Array(1536).fill(0);
  }
  
  console.log("Sending content to OpenAI for embedding...");
  // console.log(`Content snippet: "${content.substring(0, 100)}..."`);

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });

  const embedding = response.data[0].embedding;
  console.log(`Received embedding from OpenAI with dimension: ${embedding.length}.`);
  return embedding;
}
