import os
import sys
from typing import List, Dict, Any, Optional
import json
import asyncio
from datetime import datetime, timezone

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from clients import db_client, openai_client
from utils import retry_async, setup_logger

# 日志器
logger = setup_logger('episodic_extractor')

CURRENT_UTC_TIME = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

EPISODIC_EXTRACT_PROMPT_TEMPLATE = """
You are a memory extraction assistant.

# Current Time
{current_utc_time}

# Context Messages (For Reference Only - Already Processed)
{context_messages}

# Unprocessed Messages
{unprocessed_messages}

# Existing Episodic Memories (for deduplication)
{existing_memories}

# Task
Analyze whether the conversations contain **specific events, experiences, or stories** that should:
- Have a clear time point or time period
- Be one-time occurrences (not long-term attributes)
- Be narrative and plot-driven
- Be self-contained and understandable without the original conversation context

## ✅ Examples of Episodic Memories Worth Recording:
- "Visited West Lake in Hangzhou last weekend" (specific event + time)
- "Had a ByteDance interview yesterday, didn't feel great" (experience + emotion)
- "Had a dog named Blackie when I was a kid" (past experience)
- "Just had an argument with my girlfriend" (recent event)

## Time Recording Standards
All events must include time information. Standardize user's time expressions based on [Current Time]:
- If exact time can be calculated, must calculate (e.g., "yesterday" → `2025-10-14`, "just now" → `2025-10-15 20:55`, "last Friday" → `2025-10-11`)
- If only a range can be determined, record the range (e.g., "last week" → `week of 2025-10-08 to 10-14`, "last month" → `September 2025`)
- If completely vague, preserve original semantics + estimation (e.g., "a few days ago" → `a few days before 2025-10-15`, "last year" → `2024`, "when I was a kid" → `childhood`)

## ❌ Content That Should NOT Be Recorded (should be handled by Profile):
- "I have a bachelor's degree" (stable attribute, not an event)
- "I like playing basketball" (hobby, not a specific event)
- "I work at Alibaba" (current state, not an event)
- "I'm introverted" (personality trait, not an event)

## ❌ Content That Should NOT Be Recorded (casual chat):
- "Nice weather today" (meaningless small talk)
- "What time is it?" (simple Q&A)
- Content that completely duplicates existing memories

# Deduplication Strategy
- If new event **completely duplicates** existing memory, set action = "skip"
- If new event **adds details** to existing memory, set action = "update" and provide related_memory_id
- If it's a **brand new event**, set action = "new"

# Importance Scoring Guidelines
Rate each episode's importance from 0.0 to 1.0 based on subjective relevance and emotional intensity:
- **0.0-0.3**: Trivial daily events (e.g., "went grocery shopping")
- **0.4-0.6**: Notable experiences worth remembering (e.g., "visited a new restaurant", "finished a book")
- **0.7-0.9**: Important life events (e.g., "job interview", "family gathering", "trip to another city")
- **0.9-1.0**: Life-changing or highly emotional moments (e.g., "got married", "lost a loved one", "major career change")

# Language Requirements
- **CRITICAL**: The output content MUST be in the same language as the recent conversations
- If conversations are mixed-language, use the predominant language
- Maintain natural expression in the target language

# Output Format (Strictly Follow JSON Format)

If no events worth remembering:
{{
  "episodes": []
}}

If there are events:
{{
  "episodes": [
    {{
      "content": "Complete description in 50-200 characters/words, must include time information",
      "importance": 0.0-1.0,
      "action": "new/update/skip",
      "related_memory_id": "uuid (required only when action=update)"
    }}
  ]
}}

Now begin
"""


@retry_async(
    exceptions=(Exception,),
    max_tries=2,
    initial_delay=1.0,
    logger_name='episodic_extractor'
)
async def extract_episodic(
    user_id: str, 
    context_messages: List[Dict[str, Any]], 
    unprocessed_messages: List[Dict[str, Any]]
) -> Optional[List[Dict[str, Any]]]:
    """
    提取 Episodic 记忆（异步后台任务）
    
    参数:
        user_id: 用户 UUID
        context_messages: 已处理消息（仅供理解上下文）
        unprocessed_messages: 未处理消息（需要提取记忆）
    
    重试策略:
        - 最多 2 次尝试
        - 由 @retry_async 装饰器自动处理
    """
    # 获取现有记忆
    current_episodic_memories = await db_client.get_episodic_memories(user_id)

    # 构建 Prompt
    prompt = EPISODIC_EXTRACT_PROMPT_TEMPLATE.format(
        current_utc_time=CURRENT_UTC_TIME,
        context_messages=context_messages or "No context",
        unprocessed_messages=unprocessed_messages,
        existing_memories=current_episodic_memories or "No existing memories",
    )

    # 强制 JSON 格式输出
    llm_response = await openai_client.chat_completion_json(
        messages=[{"role": "user", "content": prompt}],
        model="gpt-5-mini"
    )
    
    # 记录 Prompt 和 LLM 响应
    logger.debug(f"Episodic提取 | user_id={user_id} | prompt={prompt} | llm_response={llm_response}")

    try:
        result = json.loads(llm_response)
        # 从字典中提取 episodes 数组
        episodes = result.get("episodes", [])
        # 确保返回的是列表
        if not isinstance(episodes, list):
            logger.warning(f"JSON格式错误（期望episodes字段为数组） | user_id={user_id}")
            return None
    except json.JSONDecodeError as e:
        logger.warning(f"JSON解析失败 | user_id={user_id} | error={str(e)} | response={llm_response[:200]}")
        return None

    return episodes

if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 初始化数据库连接池
        await db_client.init_pool()
        
        try:
            user_id = "24f8ed57-423c-4955-ac13-cb75de237b41"
            
            print("\n" + "="*50)
            print("开始提取 Episodic 记忆")
            print("="*50 + "\n")

            messages = await db_client.get_unprocessed_messages_with_context(user_id, context_count=4)
            
            episodes = await extract_episodic(
                user_id, 
                messages["context_messages"], 
                messages["unprocessed_messages"]
            )
            
            if episodes:
                print(f"\n✅ 成功提取 {len(episodes)} 条 Episodic 记忆:\n")
                for i, ep in enumerate(episodes, 1):
                    print(f"[{i}] Action: {ep.get('action')}")
                    print(f"    Content: {ep.get('content')}")
                    print(f"    Importance: {ep.get('importance')}\n")
                
                # 可选：写入数据库
                # for ep in episodes:
                #     if ep["action"] == "new":
                #         await db_client.insert_episodic_memory(user_id, ep["content"], ep["importance"])
                #     elif ep["action"] == "update":
                #         await db_client.update_episodic_memory(ep["related_memory_id"], ep["content"], ep["importance"])
                #     elif ep["action"] == "skip":
                #         continue  # LLM 判断重复，跳过
            else:
                print("ℹ️ 没有提取到 Episodic 记忆")
        
        finally:
            # 关闭连接池
            await db_client.close_pool()
    
    # 运行测试
    asyncio.run(test())
