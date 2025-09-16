import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("OPENAI_API_KEY")

if not api_key:
    raise ValueError("OPENAI_API_KEY must be set in environment variables.")

client = OpenAI(api_key=api_key)

def generate_response(system_prompt: str, user_prompt: str) -> str:
    """Generates a response from the LLM based on system and user prompts."""
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",  # Or any other model you prefer
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        return completion.choices[0].message.content or "Sorry, I could not generate a response."
    except Exception as e:
        print(f"Error generating LLM response: {e}")
        # In a real app, you might want to return a more specific error message
        return "An error occurred while processing your request."
