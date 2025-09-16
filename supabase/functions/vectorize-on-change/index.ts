import { handleChatMessage } from './chat.ts';
import { handleKnowledgeItem } from './knowledge.ts';
import { handleCharacter } from './character.ts';

// =================================================================
// Interfaces and Types
// =================================================================
interface WebhookPayload {
  table: string;
  record: Record<string, any>;
}

// =================================================================
// Main Deno Edge Function Handler
// =================================================================
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
      } 
    });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log(`[${new Date().toISOString()}] Received payload:`, JSON.stringify(payload, null, 2));
    const { table, record } = payload;

    // Delegate to the appropriate handler based on the table name
    switch (table) {
      case 'chat_messages':
        await handleChatMessage(record);
        break;
      case 'knowledge_items':
        await handleKnowledgeItem(record);
        break;
      case 'characters':
        await handleCharacter(record);
        break;
      default:
        // Log a warning for unhandled tables but don't throw an error
        console.warn(`Webhook received for unhandled table: ${table}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Webhook processed for table '${table}'.` 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    // Log the error for debugging purposes
    console.error(`Error processing webhook: ${err.message}`);
    
    // Return a generic error response
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
