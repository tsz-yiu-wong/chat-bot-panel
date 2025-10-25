import asyncio
import time
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

import config
import utils
from utils import setup_logger
from clients import db_client, openai_client
from tasks import context_builder, profile_updater, episodic_extractor

# 日志器
logger = setup_logger('index')


# ============================================
# 应用生命周期管理
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理器
    - 启动时：初始化数据库连接池
    - 关闭时：释放数据库连接池
    """
    # 启动逻辑
    await db_client.init_pool()
    logger.info("FastAPI应用已启动 | 数据库连接池已初始化")
    print("✅ FastAPI 应用已启动，数据库连接池已初始化")
    
    yield  # 应用运行中
    
    # 关闭逻辑
    await db_client.close_pool()
    logger.info("FastAPI应用已关闭 | 数据库连接池已释放")
    print("✅ FastAPI 应用已关闭，数据库连接池已释放")

app = FastAPI(lifespan=lifespan)


# ============================================
# 请求/响应模型
# ============================================

class ChatRequest(BaseModel):
    """聊天请求参数"""
    platform: str  # 平台名称（如 wechat, telegram）
    username: str  # 平台用户名/UID
    language: str  # 语言类型（如 en, zh, vi）
    message: str   # 用户消息内容
    model: Optional[str] = None  # 可选：指定 LLM 模型

class ChatResponse(BaseModel):
    """聊天响应"""
    reply: str  # AI 回复内容


# ============================================
# 核心路由：POST /chat/send
# ============================================

@app.post("/api/messages", response_model=ChatResponse)
async def process_message(request: ChatRequest):
    """
    处理用户聊天消息，返回 AI 回复
    """
    # 记录请求开始时间（用于性能统计）
    request_start_time = time.time()
    
    # ============================================
    # 步骤 1: 解析请求参数 + 记录用户消息到达时间
    # ============================================
    platform = request.platform
    username = request.username
    language = request.language
    user_message = request.message
    model = request.model or config.DEFAULT_MODEL
    
    # 记录接收到的请求
    logger.info(f"接收消息 | platform={platform} | username={username} | language={language} | message_length={len(user_message)}")
    
    # 记录用户消息到达时间（用于准确保存消息时间戳）
    user_message_timestamp = datetime.now()
    

    try:
        # ============================================
        # 步骤 2: 查找或创建用户
        # ============================================
        user_id = await db_client.get_or_create_user(
            platform=platform,
            platform_username=username,
            language=language
        )

        # ============================================
        # 步骤 3: 构建 Messages 数组
        # ============================================
        messages = await context_builder.build_messages_for_chat(
            user_id=user_id,
            current_query=user_message
        )

        # ============================================
        # 步骤 4: 调用 LLM 生成回复
        # ============================================
        reply = await openai_client.chat_completion(
            messages=messages,
            model=model
        )

        # ============================================
        # 步骤 5: 保存用户消息和 AI 回复
        # ============================================
        await asyncio.gather(
            db_client.insert_message(
                user_id=user_id,
                role='user',
                content=user_message,
                created_at=user_message_timestamp # 使用记录的准确时间戳
            ),
            db_client.insert_message(
                user_id=user_id,
                role='assistant',
                content=reply
            )
        )

        # ============================================
        # 步骤 6: 异步触发记忆分析（不阻塞当前对话）
        # ============================================
        asyncio.create_task(analyze_memory_async(user_id))

        # ============================================
        # 步骤 7: 记录成功并返回响应
        # ============================================
        total_time = time.time() - request_start_time
        logger.info(f"消息处理成功 | user_id={user_id} | reply_length={len(reply)} | total_time={total_time:.3f}s")
        
        return ChatResponse(reply=reply)
    
    except Exception as e:
        # 记录异常详情
        user_id_for_log = locals().get('user_id', 'unknown')
        logger.error(f"消息处理失败 | user_id={user_id_for_log} | platform={platform} | username={username} | error={str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================
# 记忆分析流程
# ============================================

async def should_trigger_memory_analysis(user_id: str) -> bool:
    """
    判断是否需要触发记忆分析（双阈值机制）
    
    触发条件（满足任一即可）:
        - 条件1: 未处理消息数 >= MEMORY_ANALYSIS_COUNT_THRESHOLD (20条)
        - 条件2: 距离上次消息时间 >= MEMORY_ANALYSIS_TIME_THRESHOLD (30分钟) 且有未处理消息
    
    前置条件:
        - 未处理消息数 >= MEMORY_ANALYSIS_MIN_MESSAGES (10条)
    
    消息保护机制:
        - 如果未处理消息数 >= MEMORY_ANALYSIS_MAX_MESSAGES (30条):
          强制标记最旧的2条为已处理
    """
    # 统计未处理消息数
    unprocessed_count = await db_client.count_unprocessed_messages(user_id)
    
    # 前置条件检查
    if unprocessed_count < config.MEMORY_ANALYSIS_MIN_MESSAGES:
        return False
    
    # 消息保护机制
    if unprocessed_count >= config.MEMORY_ANALYSIS_MAX_MESSAGES:
        force_mark_count = config.MEMORY_ANALYSIS_FORCE_MARK_OLD_MESSAGES_COUNT
        await db_client.force_mark_oldest_processed(user_id, force_mark_count)
        logger.warning(f"触发消息保护机制 | user_id={user_id} | unprocessed_count={unprocessed_count} | force_mark_count={force_mark_count}")
        print(f"⚠️ 消息保护机制触发 - User ID: {user_id}, 强制标记 {force_mark_count} 条最旧消息为已处理")
        return True
    
    # 条件1: 消息数阈值
    if unprocessed_count >= config.MEMORY_ANALYSIS_COUNT_THRESHOLD:
        logger.info(f"触发记忆分析（消息数阈值）| user_id={user_id} | unprocessed_count={unprocessed_count}")
        return True
    
    # 条件2: 时间阈值
    last_message_time = await db_client.get_last_message_time(user_id)
    if last_message_time:
        time_diff = datetime.now(timezone.utc) - last_message_time
        if time_diff >= timedelta(minutes=config.MEMORY_ANALYSIS_TIME_THRESHOLD):
            logger.info(f"触发记忆分析（时间阈值）| user_id={user_id} | time_diff={time_diff.total_seconds()/60:.1f}min")
            return True
    
    return False


async def analyze_memory_async(user_id: str):
    """
    异步执行记忆分析（不阻塞对话）
    
    执行步骤:
        0. 检查是否需要触发记忆分析（双阈值机制）
        1. 获取未处理消息
        2. 并行执行分析任务（Profile + Episodic）
        3. 处理结果并写入数据库
        4. 标记消息为已处理
    """
    # ============================================
    # 步骤 0: 检查是否需要触发记忆分析
    # ============================================
    should_analyze = await should_trigger_memory_analysis(user_id)
    if not should_analyze:
        return
    
    logger.info(f"开始记忆分析 | user_id={user_id}")
    print(f"🔍 开始记忆分析 - User ID: {user_id}")
    
    # ============================================
    # 步骤 1: 获取未处理消息（带上下文）
    # ============================================
    messages = await db_client.get_unprocessed_messages_with_context(user_id)
    context_messages = messages["context_messages"]
    unprocessed_messages = messages["unprocessed_messages"]

    # ============================================
    # 步骤 2: 并行执行分析任务
    # ============================================
    try:
        profile_result, episodes = await asyncio.gather(
            profile_updater.analyze_profile_update(user_id, context_messages, unprocessed_messages),
            episodic_extractor.extract_episodic(user_id, context_messages, unprocessed_messages)
        )
    except Exception as e:
        logger.error(f"记忆分析失败 | user_id={user_id} | error={str(e)}", exc_info=True)
        print(f"❌ 记忆分析失败 - User ID: {user_id}, Error: {e}")
        return
    
    # ============================================
    # 步骤 3: 处理结果并写入数据库
    # ============================================
    # 处理 Profile 更新
    if profile_result and profile_result[0]:  # (new_profile, old_updated_at)
        new_profile, old_updated_at = profile_result
        success = await db_client.upsert_profile(user_id, new_profile, old_updated_at)
        if success:
            logger.info(f"Profile更新成功 | user_id={user_id}")
            print(f"✅ Profile 更新成功 - User ID: {user_id}")
        else:
            logger.warning(f"Profile更新失败（乐观锁冲突）| user_id={user_id}")
            print(f"⚠️ Profile 更新失败（乐观锁冲突） - User ID: {user_id}")
    else:
        logger.info(f"无需更新Profile | user_id={user_id}")
        print(f"ℹ️ 无需更新 Profile - User ID: {user_id}")
    
    # 处理 Episodic 记忆
    if episodes:
        for ep in episodes:
            if ep.get("action") == "new":
                await db_client.insert_episodic_memory(user_id, ep["content"], ep["importance"])
            elif ep.get("action") == "update":
                await db_client.update_episodic_memory(ep["related_memory_id"], ep["content"], ep["importance"])
            # action == "skip" 则不处理
        logger.info(f"Episodic记忆提取完成 | user_id={user_id} | count={len(episodes)}")
        print(f"✅ 提取了 {len(episodes)} 条 Episodic 记忆 - User ID: {user_id}")
    else:
        logger.info(f"无新Episodic记忆 | user_id={user_id}")
        print(f"ℹ️ 无新 Episodic 记忆 - User ID: {user_id}")
    
    # ============================================
    # 步骤 4: 标记消息为已处理
    # ============================================
    message_ids = [msg['id'] for msg in unprocessed_messages]
    await db_client.mark_messages_processed(user_id, message_ids)
    logger.info(f"记忆分析完成 | user_id={user_id} | processed_messages={len(message_ids)}")
    print(f"✅ 记忆分析完成 - User ID: {user_id}")
