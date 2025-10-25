import os
import sys
from typing import Tuple, Optional, List, Dict, Any
import asyncio

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from clients import db_client, openai_client
from utils import retry_async, setup_logger

# 日志器
logger = setup_logger('profile_updater')

PROFILE_UPDATE_PROMPT_TEMPLATE = """
You are a memory management assistant.

# Current User Profile
{current_profile}

# Context Messages (For Reference Only - Already Processed)
{context_messages}

# Unprocessed Messages
{unprocessed_messages}

# Task
Analyze whether the conversations contain **stable, long-term identity information** that should be updated in the user profile.

## What to Include (Profile = Stable Identity)
Extract information that represents **stable, long-term characteristics, preferences, or circumstances** explicitly stated by the user. Focus on:
- Who the user IS (not what they DID)
- Their enduring traits, preferences, values, and goals
- Stable aspects of their life that define their identity

## What to EXCLUDE (Episodic Memory)
DO NOT include:
- Specific events, experiences, or past activities
- Achievements, competition results, travel history
- **Inferred preferences** - do NOT guess (e.g., playing volleyball once ≠ "loves volleyball")

## Critical Rules
- **ONLY record explicitly stated information** - do NOT infer
- Focus on "who the user IS" not "what the user DID"
- If unsure, EXCLUDE it

## Update Guidelines
- If new information refines or replaces existing ones (e.g., updated occupation, changed major, new location), rewrite coherently instead of appending duplicates
- Maintain sentence style, tone, and granularity consistent with the existing profile
- Ensure logical flow with related content grouped together

# Language Requirements
- **CRITICAL**: The output MUST be in the same language as the current profile
- If the profile is empty, use the language of the recent conversations
- Maintain consistent language throughout the entire profile

# Output Format (Strictly Follow)
If no update is needed, output only: NO_UPDATE
If update is needed, output only the complete updated profile (plain text, no prefix or explanation).
The profile update must ensure logical flow and coherence, with related content grouped together.

# Examples

## Example 1: Correct Update
Input profile: Name is Xiaoming, 20 years old. University student majoring in Finance.
Conversation: User says "I switched majors, now studying Computer Science"
Output: Name is Xiaoming, 20 years old. University student majoring in Computer Science.

## Example 2: Do NOT Include Episodic Details
Input profile: Name is Xiaohong. Undergraduate in Finance, now studying for a master's in Computer Science.
Conversation: User says "I'm on the school volleyball team. We competed nationally and won second place. During the competition, we trained in Beijing for a week, and after the competition I visited Tiananmen, the Forbidden City, and the Great Wall."
Output: Name is Xiaohong. Undergraduate in Finance, now studying for a master's in Computer Science. Member of the school volleyball team.
(Note: Competition results, training location, and travel activities are episodic details - excluded)

## Example 3: Do NOT Infer Without Explicit Statement
Input profile: Name is Xiaogang, works as a software engineer.
Conversation: User mentions "I went skiing this weekend"
Output: NO_UPDATE
(Note: Going skiing once does NOT mean user "loves skiing" - do not infer preferences)

Now begin:
"""

# ============================================
# 构建 Prompt 并调用 LLM
# ============================================
@retry_async(
    exceptions=(Exception,),
    max_tries=2,
    initial_delay=1.0,
    logger_name='profile_updater'
)
async def analyze_profile_update(
    user_id: str, 
    context_messages: List[Dict[str, Any]], 
    unprocessed_messages: List[Dict[str, Any]]
) -> Tuple[Optional[str], Optional[str]]:
    """
    调用 LLM 分析是否需要更新 Profile
    
    参数:
        user_id: 用户uuid
        context_messages: 已处理消息（仅供理解上下文）
        unprocessed_messages: 未处理消息（需要分析更新）

    返回:
        (新的Profile内容, 旧的updated_at时间戳)
        - 如果需要更新: 返回 (新profile文本, 旧timestamp)
        - 如果无需更新: 返回 (None, None)
    
    重试策略:
        - 最多 2 次尝试（失败成本较高，但不应过度重试）
        - 由 @retry_async 装饰器自动处理
    """
    # 获取当前画像（带timestamp用于乐观锁）
    current_profile_content, old_updated_at = await db_client.get_profile_with_timestamp(user_id)
    
    # 构建 Prompt
    prompt = PROFILE_UPDATE_PROMPT_TEMPLATE.format(
        current_profile=current_profile_content or "No profile",
        context_messages=context_messages or "No context",
        unprocessed_messages=unprocessed_messages
    )
    
    # 调用 LLM
    llm_response = await openai_client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        model="gpt-5-mini"
    )
    
    # 记录 Prompt 和 LLM 响应
    logger.debug(f"Profile更新 | user_id={user_id} | prompt={prompt} | llm_response={llm_response}")
    
    # 检查是否需要更新
    if llm_response.strip().upper() == "NO_UPDATE":
        return (None, None)
    
    # 返回新的profile内容和旧的timestamp（用于乐观锁）
    return (llm_response.strip(), old_updated_at)



if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 初始化数据库连接池
        await db_client.init_pool()
        
        try:
            user_id = "24f8ed57-423c-4955-ac13-cb75de237b41"
            
            print("\n" + "="*50)
            print("开始分析 Profile 更新")
            print("="*50 + "\n")
            
            # 获取带上下文的消息
            messages = await db_client.get_unprocessed_messages_with_context(user_id)
            
            # 分析是否需要更新（返回新profile和旧timestamp）
            new_profile, old_updated_at = await analyze_profile_update(
                user_id, 
                messages["context_messages"], 
                messages["unprocessed_messages"]
            )
            
            if new_profile:
                print(f"\n📝 LLM 建议更新 Profile:")
                print("="*50)
                print(new_profile)
                print("="*50)
                print(f"\n⏰ 旧时间戳: {old_updated_at}")
                
                # 可选：写入数据库
                # success = await db_client.upsert_profile(
                #     user_id=user_id,
                #     new_content=new_profile,
                #     old_updated_at=old_updated_at
                # )
                # 
                # if success:
                #     print(f"✅ Profile 更新成功 - User ID: {user_id}")
                # else:
                #     print(f"⚠️ Profile 更新失败（乐观锁冲突） - User ID: {user_id}")
            else:
                print("ℹ️ 无需更新 Profile")
        
        finally:
            # 关闭连接池
            await db_client.close_pool()
    
    # 运行测试
    asyncio.run(test())
