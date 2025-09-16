from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import db_client
import llm_client

app = FastAPI()

class ChatRequest(BaseModel):
    character_id: int
    prompt_id: int
    user_message: str
    language: str = 'zh' # Default to Chinese

@app.post("/api/chat/process")
async def process_chat(request: ChatRequest):
    """
    Main chat processing endpoint.
    It fetches character and prompt info, constructs a prompt for the LLM,
    and returns the LLM's response.
    """
    # 1. Fetch data from the database
    character = db_client.get_character(request.character_id)
    prompt_template = db_client.get_prompt(request.prompt_id)

    if not character:
        raise HTTPException(status_code=404, detail=f"Character with ID {request.character_id} not found.")
    if not prompt_template:
        raise HTTPException(status_code=404, detail=f"Prompt with ID {request.prompt_id} not found.")

    # 2. Construct the system prompt
    # This is a simplified example. You can build a more complex prompt constructor.
    # We select the character description based on the requested language.
    lang_suffix = request.language
    character_description = character.get(f'description_{lang_suffix}', character.get('description_zh', ''))
    prompt_content = prompt_template.get(f'content_{lang_suffix}', prompt_template.get('content_zh', ''))
    
    system_prompt = f"""
You are a character with the following personality: {character_description}.
Your instructions for this conversation are: {prompt_content}.
Please respond in {request.language}.
"""

    # 3. Generate response from LLM
    llm_response = llm_client.generate_response(
        system_prompt=system_prompt,
        user_prompt=request.user_message
    )

    # 4. Return the response
    return {"response": llm_response}
