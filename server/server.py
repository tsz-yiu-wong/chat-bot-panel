import os
import time
import uuid
import dotenv
import uvicorn
from fastapi import FastAPI, Request, HTTPException, status, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any
from .main import load_model, generate_chat_response

dotenv.load_dotenv()

app = FastAPI(title="OpenAI-Compatible Chat API", version="1.0.0")

tokenizer, model = None, None
REQUIRED_TOKEN = os.environ.get("CHAT_BOT_API_KEY")
FRONTEND_URLS_STR = os.environ.get("FRONTEND_URLS", "")
ALLOWED_FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS_STR.split(',') if url.strip()] if FRONTEND_URLS_STR else []

class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色: system, user, assistant")
    content: Union[str, List[Dict[str, Any]]] = Field(..., description="消息内容")

class ChatCompletionRequest(BaseModel):
    model: str = Field(default="qwen-3-1.7b", description="模型名称")
    messages: List[ChatMessage] = Field(..., description="聊天消息列表")
    max_tokens: Optional[int] = Field(512, ge=1, le=4096, description="最大生成token数")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="采样温度")
    top_p: Optional[float] = Field(0.8, ge=0.0, le=1.0, description="核采样概率")
    top_k: Optional[int] = Field(20, ge=1, description="top-k采样")
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="频率惩罚")
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="存在惩罚")
    repetition_penalty: Optional[float] = Field(1.1, ge=0.1, le=2.0, description="重复惩罚")
    stream: Optional[bool] = Field(False, description="是否流式输出")
    stop: Optional[Union[str, List[str]]] = Field(None, description="停止标记")
    n: Optional[int] = Field(1, ge=1, le=1, description="生成选择数")
    logprobs: Optional[bool] = Field(False, description="是否返回logprobs")
    echo: Optional[bool] = Field(False, description="是否回显prompt")
    seed: Optional[int] = Field(None, description="随机种子")
    user: Optional[str] = Field(None, description="用户标识")

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

class ErrorResponse(BaseModel):
    error: Dict[str, Any]

@app.on_event("startup")
def startup_event():
    global tokenizer, model
    print("正在启动 OpenAI 兼容聊天服务...")
    tokenizer, model = load_model()
    if tokenizer is None or model is None:
        print("❌ 模型加载失败！")
        exit(1)
    print("✅ 模型加载成功！")

def check_token(request: Request, authorization: Optional[str]):
    """
    验证请求的来源或Authorization头中的token。

    验证逻辑:
    1. 如果请求的 'origin' 头在 FRONTEND_URLS 环境变量定义的白名单中，则跳过token验证。
    2. 如果未设置白名单，或来源不在白名单中，则检查 CHAT_BOT_API_KEY。
    3. 如果 CHAT_BOT_API_KEY 未设置，则跳过token验证。
    4. 如果以上条件都不满足，则必须提供有效的 Bearer token。
    """
    origin = request.headers.get("origin")
    
    # 1. 检查来源是否在白名单中
    if origin and ALLOWED_FRONTEND_URLS and origin in ALLOWED_FRONTEND_URLS:
        print(f"INFO: 请求来源 '{origin}' 在白名单中，跳过Token验证。")
        return

    # 2. 如果来源不在白名单，则回退到token验证
    if not REQUIRED_TOKEN:
        print("WARN: 未设置 CHAT_BOT_API_KEY 环境变量，所有非白名单来源的请求都将被允许。")
        return
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="缺少Authorization头"
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Authorization格式错误，应为: Bearer <token>"
        )
    
    token = authorization.split(" ", 1)[1]
    if token != REQUIRED_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="API Key无效"
        )
    
    print("INFO: API Key验证成功。")

@app.get("/")
async def root():
    return {"message": "OpenAI Compatible Chat API", "status": "running"}

@app.get("/api/v1/models")
async def list_models():
    """列出可用模型"""
    return {
        "object": "list",
        "data": [
            {
                "id": "Qwen3-1.7B_quantized",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "local"
            }
        ]
    }

@app.post("/api/v1/chat", response_model=Union[ChatCompletionResponse, ErrorResponse])
async def create_chat_completion(payload: ChatCompletionRequest, request: Request, authorization: str = Header(None)):
    """处理聊天请求，返回AI生成的完整回复。"""
    try:
        check_token(request, authorization)
        
        if tokenizer is None or model is None:
            raise HTTPException(status_code=500, detail="模型未正确加载")
        
        # 转换消息格式
        chat_messages = []
        
        # 如果用户没有提供 system prompt，则添加一个默认的
        if not payload.messages or payload.messages[0].role != "system":
            print("INFO: 未提供 system prompt，将添加默认值。")
            chat_messages.append({
                "role": "system",
                "content": "你是一个乐于助人的AI助手。"
            })
            
        for msg in payload.messages:
            chat_messages.append({
                "role": msg.role,
                "content": msg.content if isinstance(msg.content, str) else str(msg.content)
            })
        
        # 调用生成函数
        response_text = generate_chat_response(
            tokenizer=tokenizer,
            model=model,
            messages=chat_messages,
            max_tokens=payload.max_tokens or 512,
            temperature=payload.temperature or 0.7,
            top_p=payload.top_p or 0.8,
            top_k=payload.top_k,
            frequency_penalty=payload.frequency_penalty or 0.0,
            presence_penalty=payload.presence_penalty or 0.0,
            repetition_penalty=payload.repetition_penalty or 1.1,
            do_sample=(payload.temperature or 0.7) > 0
        )
        
        if response_text is None:
            raise HTTPException(status_code=500, detail="生成回复失败")
        
        # 构建响应
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
        created_time = int(time.time())
        
        # 简单的token计数估算
        prompt_tokens = sum(len(str(msg['content']).split()) for msg in chat_messages)
        completion_tokens = len(response_text.split())
        total_tokens = prompt_tokens + completion_tokens
        
        response = {
            "id": completion_id,
            "object": "chat.completion",
            "created": created_time,
            "model": payload.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"处理请求时出错: {e}")
        raise HTTPException(status_code=500, detail=f"内部服务器错误: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "model_loaded": tokenizer is not None and model is not None,
        "timestamp": int(time.time())
    }

def main():
    print("🚀 启动 AI 聊天服务...")
    print("📖 API 文档: http://localhost:8000/docs")
    print("🔗 主要聊天接口: http://localhost:8000/api/v1/chat")
    uvicorn.run("chat_bot_model.server:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main() 