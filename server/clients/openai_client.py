import os
import sys
from typing import List, Dict
from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError
from dotenv import load_dotenv
import hashlib

# 添加父目录到路径，确保能导入 config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from utils import retry_async, setup_logger

load_dotenv()

# 日志器
logger = setup_logger('openai_client')

# 初始化 OpenAI 异步客户端
client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

# Embedding 缓存（内存缓存，应用重启后清空）
_embedding_cache = {}


@retry_async(
    exceptions=(APIError, RateLimitError, APITimeoutError),
    max_tries=3,
    initial_delay=1.0,
    logger_name='openai_client'
)
async def chat_completion(messages: List[Dict[str, str]], model: str) -> str:
    """
    发送消息数组，获取 LLM 回复（标准聊天补全）
    
    参数:
        messages: OpenAI 格式的消息数组
                 [{"role": "system/user/assistant", "content": "..."}]
        model: 使用的模型（如 gpt-4, gpt-3.5-turbo）
    
    返回:
        LLM 生成的回复文本
    
    用途:
        - 对话生成
        - Profile 更新判断
    
    重试策略:
        - 重试 APIError, RateLimitError, APITimeoutError
        - 最多 3 次尝试
        - 指数退避（1s, 2s, 4s）
    """
    completion = await client.chat.completions.create(
        model=model,
        messages=messages,
    )
    return completion.choices[0].message.content or ""


@retry_async(
    exceptions=(APIError, RateLimitError, APITimeoutError),
    max_tries=3,
    initial_delay=1.0,
    logger_name='openai_client'
)
async def chat_completion_json(messages: List[Dict[str, str]], model: str) -> str:
    """
    强制 JSON 格式输出（用于结构化数据提取）
    
    参数:
        messages: OpenAI 格式的消息数组
        model: 使用的模型
    
    返回:
        JSON 格式的字符串
    
    用途:
        - Episodic 事件提取
    
    重试策略:
        - 重试 APIError, RateLimitError, APITimeoutError
        - 最多 3 次尝试
        - 指数退避（1s, 2s, 4s）
    """
    completion = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"}
    )
    return completion.choices[0].message.content or "{}"


@retry_async(
    exceptions=(APIError, RateLimitError, APITimeoutError),
    max_tries=3,
    initial_delay=1.0,
    logger_name='openai_client'
)
async def generate_embedding(text: str, use_cache: bool = True) -> List[float]:
    """
    生成文本的向量嵌入（用于向量检索）
    
    参数:
        text: 待嵌入的文本
        use_cache: 是否使用缓存（默认 True）
    
    返回:
        向量数组（1536 维，对应 text-embedding-3-small）
    
    性能优化:
        - 使用内存缓存避免重复调用 OpenAI API
        - 缓存命中时可节省 ~1.2秒
    
    重试策略:
        - 重试 APIError, RateLimitError, APITimeoutError
        - 最多 3 次尝试
        - 指数退避（1s, 2s, 4s）
    """
    # 生成缓存 key（使用文本的 MD5）
    if use_cache:
        cache_key = hashlib.md5(text.encode('utf-8')).hexdigest()
        
        # 检查缓存
        if cache_key in _embedding_cache:
            return _embedding_cache[cache_key]
    
    response = await client.embeddings.create(
        model=config.EMBEDDING_MODEL,
        input=text
    )
    embedding = response.data[0].embedding
    
    # 写入缓存（限制缓存大小，避免内存溢出）
    if use_cache:
        if len(_embedding_cache) >= 1000:  # 限制最多缓存 1000 条
            # 删除最早的一条（简单 FIFO 策略）
            _embedding_cache.pop(next(iter(_embedding_cache)))
        _embedding_cache[cache_key] = embedding
    
    return embedding


def clear_embedding_cache():
    """清空 embedding 缓存（用于测试或内存管理）"""
    global _embedding_cache
    _embedding_cache = {}
    logger.info("Embedding 缓存已清空")


def get_cache_stats():
    """获取缓存统计信息"""
    return {
        "cache_size": len(_embedding_cache),
        "cache_limit": 1000
    }


# ============================================
# 测试代码
# ============================================

if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 测试 chat_completion
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, how are you?"}
        ]
        response = await chat_completion(messages, "gpt-5-nano")
        print(f"Chat Completion Response: {response}")
        
        # 测试 generate_embedding
        embedding = await generate_embedding("Hello, world!")
        print(f"Embedding Length: {len(embedding)}")
        print(f"First 5 dimensions: {embedding[:5]}")
    
    # 运行测试
    asyncio.run(test())
