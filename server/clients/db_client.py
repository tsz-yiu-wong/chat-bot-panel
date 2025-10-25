import os
import sys
import ssl
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import asyncpg
from dotenv import load_dotenv

# 添加父目录到路径，确保能导入 config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from utils import retry_async, setup_logger

load_dotenv()

# 全局连接池
_pool: Optional[asyncpg.Pool] = None

# 日志器
logger = setup_logger('db_client')


# ============================================
# 连接池管理
# ============================================

@retry_async(
    exceptions=(Exception,),  # 捕获所有异常（包括网络错误、SSL错误等）
    max_tries=5,  # 启动阶段多重试几次
    initial_delay=2.0,  # 初始延迟稍长
    logger_name='db_client'
)
async def init_pool():
    """初始化数据库连接池（应用启动时调用）"""
    global _pool
    if _pool is None:
        # 配置 SSL 上下文（Supabase 需要）
        ssl_context = ssl.create_default_context(
            cafile=os.path.join(os.path.dirname(__file__), '..', 'prod-ca-2021.crt')
        )
        ssl_context.check_hostname = True  # 验证主机名
        ssl_context.verify_mode = ssl.CERT_REQUIRED  # 要求验证证书
        
        _pool = await asyncpg.create_pool(
            config.POSTGRES_URI,
            ssl=ssl_context,  # 添加 SSL 上下文
            min_size=config.DATABASE_POOL_MIN_SIZE,
            max_size=config.DATABASE_POOL_MAX_SIZE,
            timeout=config.DATABASE_POOL_TIMEOUT
        )
        logger.info(f"数据库连接池已初始化 | SSL=enabled | min_size={config.DATABASE_POOL_MIN_SIZE} | max_size={config.DATABASE_POOL_MAX_SIZE}")


@retry_async(
    exceptions=(Exception,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def close_pool():
    """关闭数据库连接池（应用关闭时调用）"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("数据库连接池已关闭")


def get_pool() -> asyncpg.Pool:
    """获取数据库连接池"""
    if _pool is None:
        raise RuntimeError("数据库连接池未初始化，请先调用 init_pool()")
    return _pool


# ============================================
# 用户管理
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_or_create_user(platform: str, platform_username: str, language: str = "en") -> str:
    """
    根据 platform + platform_username 查找或创建用户
    
    参数:
        platform: 平台名称（如 wechat, telegram）
        platform_username: 平台用户名/UID
        language: 用户语言（默认 'en'，可选 'zh', 'vi' 等）
    
    返回:
        用户 UUID (user_id)
    """
    pool = get_pool()
    
    # 1. 尝试查找现有用户
    async with pool.acquire() as conn:
        user_id = await conn.fetchval(
            """
            SELECT id FROM chat_users
            WHERE platform = $1 AND platform_username = $2 AND is_deleted = false
            LIMIT 1
            """,
            platform, platform_username
        )
        
        # 2. 如果找到用户，直接返回
        if user_id:
            return user_id
        
        # 3. 如果不存在，创建新用户
        user_id = await conn.fetchval(
            """
            INSERT INTO chat_users (uid, platform, platform_username, language, character_id, current_stage_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            f"{platform}: {platform_username}",
            platform,
            platform_username,
            language,
            config.get_default_character_id(language),
            config.DEFAULT_STAGE_ID
        )
        
        if not user_id:
            raise Exception(f"创建用户失败: platform={platform}, platform_username={platform_username}")
        
        logger.info(f"创建新用户 | user_id={user_id} | platform={platform} | username={platform_username} | language={language}")
        return user_id


@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_user_info(user_id: str) -> Optional[Dict[str, Any]]:
    """
    根据 user_id 获取用户完整信息
    
    参数:
        user_id: 用户 UUID
    
    返回:
        用户信息字典，包含 character_id, current_stage_id, language 等所有字段
        如果用户不存在，返回 None
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM chat_users
            WHERE id = $1 AND is_deleted = false
            """,
            user_id
        )
        
        if row:
            return dict(row)
        
        return None


# ============================================
# 消息操作
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def insert_message(user_id: str, role: str, content: str, created_at: Optional[str] = None) -> str:
    """
    插入新消息到数据库
    
    参数:
        user_id: 用户 UUID
        role: 角色（user/assistant）
        content: 消息内容
        created_at: 可选，指定消息创建时间（用于确保用户消息时间准确）
    
    返回:
        新消息的 message_id
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        # 如果指定了 created_at，使用指定时间；否则使用数据库默认时间
        if created_at:
            message_id = await conn.fetchval(
                """
                INSERT INTO chat_messages (user_id, role, content, is_processed, created_at)
                VALUES ($1, $2, $3, false, $4)
                RETURNING id
                """,
                user_id, role, content, created_at
            )
        else:
            message_id = await conn.fetchval(
                """
                INSERT INTO chat_messages (user_id, role, content, is_processed)
                VALUES ($1, $2, $3, false)
                RETURNING id
                """,
                user_id, role, content
            )
        
        if not message_id:
            raise Exception(f"插入消息失败: user_id={user_id}, role={role}")
        
        return message_id

# 获取最近N条对话消息，用于构建三层记忆
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_recent_messages(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    获取最近 N 条对话消息（短期记忆）
    
    参数:
        user_id: 用户 UUID
        limit: 返回数量
    
    返回:
        消息列表（按时间升序）
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content FROM chat_messages
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user_id, limit
        )
        
        # 反转列表，使其按时间升序返回（最旧的在前，最新的在后）
        return [dict(row) for row in reversed(rows)]

# 获取未处理的消息（带上下文），用于记忆分析
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_unprocessed_messages_with_context(user_id: str, context_count: int = 4) -> Dict[str, List[Dict[str, Any]]]:
    """
    获取未处理的消息 + 最近N条已处理消息作为上下文
    
    参数:
        user_id: 用户 UUID
        context_count: 上下文消息数量（默认4条）
    
    返回:
        {
            "context_messages": [...],     # 最近N条已处理消息（仅供理解上下文）
            "unprocessed_messages": [...]  # 未处理消息（需要提取记忆）
        }
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        # 获取未处理消息
        unprocessed_rows = await conn.fetch(
            """
            SELECT id, role, content FROM chat_messages
            WHERE user_id = $1 AND is_processed = false
            ORDER BY created_at ASC
            """,
            user_id
        )
        
        # 获取最近N条已处理消息作为上下文
        context_rows = await conn.fetch(
            """
            SELECT id, role, content FROM chat_messages
            WHERE user_id = $1 AND is_processed = true
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user_id, context_count
        )
        
        return {
            "context_messages": [dict(row) for row in reversed(context_rows)],  # 反转为时间升序
            "unprocessed_messages": [dict(row) for row in unprocessed_rows]
        }

# 统计未处理消息数量，用于判断是否触发记忆分析
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def count_unprocessed_messages(user_id: str) -> int:
    """
    统计未处理消息数量
    
    参数:
        user_id: 用户 UUID
    
    返回:
        未处理消息数量
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM chat_messages
            WHERE user_id = $1 AND is_processed = false
            """,
            user_id
        )
        
        return count or 0

# 获取最后一条消息的时间，用于判断是否触发记忆分析
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_last_message_time(user_id: str) -> Optional[datetime]:
    """
    获取最后一条消息的时间
    
    参数:
        user_id: 用户 UUID
    
    返回:
        最后消息时间（datetime对象），如果没有消息返回 None
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        created_at = await conn.fetchval(
            """
            SELECT created_at FROM chat_messages
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id
        )
        
        return created_at

# 强制标记最旧的N条未处理消息为已处理，用于消息保护机制
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def force_mark_oldest_processed(user_id: str, count: int = 10) -> bool:
    """
    强制标记最旧的 N 条未处理消息为已处理（消息保护机制）
    
    参数:
        user_id: 用户 UUID
        count: 要标记的消息数量
    
    返回:
        操作是否成功
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        # 1. 先查询最旧的 N 条未处理消息
        rows = await conn.fetch(
            """
            SELECT id FROM chat_messages
            WHERE user_id = $1 AND is_processed = false
            ORDER BY created_at ASC
            LIMIT $2
            """,
            user_id, count
        )
        
        if not rows:
            return True  # 没有未处理消息，返回成功
        
        # 2. 提取消息 ID 列表
        message_ids = [row['id'] for row in rows]
        
        # 3. 记录触发保护机制
        logger.warning(f"触发消息保护机制 | user_id={user_id} | 强制标记={len(message_ids)}条")
        
        # 4. 批量更新这些消息
        return await mark_messages_processed(user_id, message_ids)

# 标记消息为已处理，用于记忆分析后的标记
@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def mark_messages_processed(user_id: str, message_ids: List[str]) -> bool:
    """
    标记消息为已处理
    
    参数:
        user_id: 用户 UUID
        message_ids: 消息 ID 列表
    
    返回:
        操作是否成功
    """
    if not message_ids:
        return True  # 空列表直接返回成功
    
    pool = get_pool()
    
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE chat_messages 
            SET is_processed = true 
            WHERE user_id = $1 AND id = ANY($2)
            """,
            user_id, message_ids
        )
        
        logger.info(f"标记消息已处理 | user_id={user_id} | count={len(message_ids)}")
        return True


# ============================================
# Profile 操作
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_profile_with_timestamp(user_id: str) -> Tuple[Optional[str], Optional[datetime]]:
    """
    获取用户画像内容和更新时间（用于乐观锁）
    
    参数:
        user_id: 用户 UUID
    
    返回:
        (画像内容, updated_at)
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT content, updated_at FROM chat_users_profile
            WHERE user_id = $1
            """,
            user_id
        )
        
        if row:
            return (row['content'], row['updated_at'])
        
        return (None, None)


@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def upsert_profile(user_id: str, new_content: str, old_updated_at: Optional[datetime]) -> bool:
    """
    更新用户画像（带乐观锁，服务端实现）
    
    参数:
        user_id: 用户 UUID
        new_content: 新的画像内容
        old_updated_at: 旧的更新时间（datetime对象，用于乐观锁）
    
    返回:
        更新是否成功（False 表示版本冲突）
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        # 如果没有旧时间戳，说明是首次创建
        if old_updated_at is None:
            result = await conn.fetchval(
                """
                INSERT INTO chat_users_profile (user_id, content)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO NOTHING
                RETURNING id
                """,
                user_id, new_content
            )
            success = result is not None
            if success:
                logger.info(f"创建用户画像 | user_id={user_id} | content_length={len(new_content)}")
            return success
        
        # 否则执行带乐观锁的更新
        result = await conn.execute(
            """
            UPDATE chat_users_profile
            SET content = $2
            WHERE user_id = $1 AND updated_at = $3
            """,
            user_id, new_content, old_updated_at
        )
        
        # 检查是否有行被更新
        # result 格式为 "UPDATE N"，提取更新的行数
        rows_updated = int(result.split()[-1])
        if rows_updated > 0:
            logger.info(f"更新用户画像 | user_id={user_id} | content_length={len(new_content)}")
            return True
        else:
            logger.warning(f"更新用户画像失败（乐观锁冲突）| user_id={user_id}")
            return False


# ============================================
# Episodic 操作
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_episodic_memories(user_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    根据用户 ID 获取所有情景记忆
    
    参数:
        user_id: 用户 UUID
    
    返回:
        包含记忆信息的列表，如果不存在返回 None
        格式: [{"id": "...", "content": "...", "importance_score": 0.5}, ...]
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, content, importance_score FROM chat_users_episodic_memories
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )
        
        if rows:
            return [dict(row) for row in rows]
        
        return None


@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def insert_episodic_memory(user_id: str, content: str, importance: float) -> Optional[str]:
    """
    插入新的情景记忆
    
    参数:
        user_id: 用户 UUID
        content: 记忆内容（50-200字）
        importance: 重要性分数（0-1）
    
    返回:
        新记忆的 memory_id，失败返回 None
    
    注意: embedding 为 NULL，触发器 handle_episodic_memory_change 会自动调用 Edge Function 生成向量
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        memory_id = await conn.fetchval(
            """
            INSERT INTO chat_users_episodic_memories (user_id, content, importance_score, embedding)
            VALUES ($1, $2, $3, NULL)
            RETURNING id
            """,
            user_id, content, importance
        )
        
        if memory_id:
            logger.info(f"插入情景记忆 | memory_id={memory_id} | user_id={user_id} | importance={importance:.2f}")
            return memory_id
        else:
            return None


@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def update_episodic_memory(memory_id: str, content: str, importance: float) -> bool:
    """
    更新已有情景记忆（不使用乐观锁）
    
    参数:
        memory_id: 记忆 UUID
        content: 新的内容
        importance: 新的重要性分数
    
    返回:
        更新是否成功
    
    注意: 
        - 设置 embedding = NULL 会触发 handle_episodic_memory_change 重新生成向量
        - 不使用乐观锁：Episodic Update 并发概率低，即使覆盖影响也不大
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE chat_users_episodic_memories
            SET content = $2, importance_score = $3, embedding = NULL
            WHERE id = $1
            """,
            memory_id, content, importance
        )
        
        # 检查是否有行被更新
        rows_updated = int(result.split()[-1])
        
        if rows_updated > 0:
            logger.info(f"更新情景记忆 | memory_id={memory_id} | importance={importance:.2f}")
            return True
        else:
            return False


# ============================================
# Prompt 操作
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_prompt(stage_id: str, language: str) -> Optional[Dict[str, Any]]:
    """
    从数据库读取 Prompt 模板
    
    参数:
        stage_id: Stage UUID
        language: 语言代码（zh, en, vi）
    
    返回:
        包含 name 和 prompt 的字典，如果不存在返回 None
        格式: {"name": "...", "prompt": "..."}
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT name, prompt FROM prompts
            WHERE stage_id = $1 AND language = $2 AND is_deleted = false
            LIMIT 1
            """,
            stage_id, language
        )
        
        if row:
            return {
                "name": row['name'],
                "prompt": row['prompt']
            }
        
        return None


# ============================================
# Character 操作
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='db_client'
)
async def get_character_self_evaluation(character_id: str) -> Optional[str]:
    """
    获取角色自我评价
    
    参数:
        character_id: 角色 UUID
    
    返回:
        角色自我评价字符串，如果不存在返回 None
    """
    pool = get_pool()
    
    async with pool.acquire() as conn:
        self_evaluation = await conn.fetchval(
            """
            SELECT self_evaluation FROM characters
            WHERE id = $1 AND is_deleted = false
            LIMIT 1
            """,
            character_id
        )
        
        return self_evaluation


# ============================================
# 测试代码
# ============================================

if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 初始化连接池
        await init_pool()
        
        try:
            user_id = await get_or_create_user(platform="test_platform", platform_username="test_user", language="zh")
            print(f"User ID: {user_id}")
            
            # 测试用户 ID
            user_id = "24f8ed57-423c-4955-ac13-cb75de237b41"
            
            # 测试 get_user_info
            user_info = await get_user_info(user_id)
            print(f"User Info: {user_info}")
            
            # message_id1 = await  insert_message(user_id=user_id, role="assistant", content="你好啊，可以认识一下吗？")
            # message_id2 = await insert_message(user_id=user_id, role="user", content="当然可以，你叫什么？")
            # message_id3 = await insert_message(user_id=user_id, role="assistant", content="我叫小明，你呢？")
            # message_id4 = await insert_message(user_id=user_id, role="user", content="我是小红，很高兴认识你。你是什么学校毕业的？")
            # message_id5 = await insert_message(user_id=user_id, role="assistant", content="噢，本科在齐齐哈尔大学，母猪产后护理专业")
            # message_id6 = await insert_message(user_id=user_id, role="user", content="听着挺有意思的，我是读金融的")
            # message_id7 = await insert_message(user_id=user_id, role="assistant", content="金融？那有没有搭一个计算机呢？")
            # message_id8 = await insert_message(user_id=user_id, role="user", content="你简直太聪明了，我本科金融，然后现在正在读硕士，就是计算机专业！")
            # message_id9 = await insert_message(user_id=user_id, role="assistant", content="噢，那真是太好了，我真怀念我以前在学校的日子")
            # message_id10 = await insert_message(user_id=user_id, role="user", content="是啊，我也是，我现在在学校参加了排球队，前几天还代表学校参加全国比赛，拿了第二名呢！")
            # message_id11 = await insert_message(user_id=user_id, role="assistant", content="那真是太棒了，是在哪里参加的比赛？")
            # message_id12 = await insert_message(user_id=user_id, role="user", content="是在北京举办的全国大学生排球比赛")
            # message_id13 = await insert_message(user_id=user_id, role="assistant", content="不错，有没有好好玩一下北京？")
            # message_id14 = await insert_message(user_id=user_id, role="user", content="当然，打完比赛就去玩了，参观了天安门、故宫、长城这里的景点场所，长城爬的累死了，还被我的队友嘲笑了，因为他们体力都特别好")
            # message_id15 = await insert_message(user_id=user_id, role="assistant", content="真不错啊，玩了几天呀？")
            # message_id16 = await insert_message(user_id=user_id, role="user", content="玩了三天，昨天刚回来了")
            # message_id17 = await insert_message(user_id=user_id, role="assistant", content="哈哈，比赛一天玩三天，也是很享福了")
            # message_id18 = await insert_message(user_id=user_id, role="user", content="虽然比赛一天，但是我们其实提前整整一星期就到北京了，训练了一周适应，然后比赛的")
            message_id19 = await insert_message(user_id=user_id, role="assistant", content="原来如此！也是劳逸结合了")


            # 测试 get_recent_messages
            recent_messages = await get_recent_messages(user_id, limit=5)
            print(f"Recent Messages: {recent_messages}")
            
            # 测试 get_profile_with_timestamp
            profile, updated_at = await get_profile_with_timestamp(user_id)
            print(f"Profile: {profile[:100] if profile else None}...")
            print(f"Updated At: {updated_at}")
            
            # 测试 get_episodic_memories
            episodic_memories = await get_episodic_memories(user_id)
            print(f"Episodic Memories Count: {len(episodic_memories) if episodic_memories else 0}")

            
        finally:
            # 关闭连接池
            await close_pool()
    
    # 运行测试
    asyncio.run(test())

    # message_id1 = insert_message(user_id=user_id, role="assistant", content="你好啊，可以认识一下吗？")
    # message_id2 = insert_message(user_id=user_id, role="user", content="当然可以，你叫什么？")
    # message_id3 = insert_message(user_id=user_id, role="assistant", content="我叫小明，你呢？")
    # message_id4 = insert_message(user_id=user_id, role="user", content="我是小红，很高兴认识你。你是什么学校毕业的？")
    # message_id5 = insert_message(user_id=user_id, role="assistant", content="噢，本科在齐齐哈尔大学，母猪产后护理专业")
    # message_id6 = insert_message(user_id=user_id, role="user", content="听着挺有意思的，我是读金融的")
    # message_id7 = insert_message(user_id=user_id, role="assistant", content="金融？那有没有搭一个计算机呢？")
    # message_id8 = insert_message(user_id=user_id, role="user", content="你简直太聪明了，我本科金融，然后现在正在读硕士，就是计算机专业！")
    # message_id9 = insert_message(user_id=user_id, role="assistant", content="噢，那真是太好了，我真怀念我以前在学校的日子")
    # message_id10 = insert_message(user_id=user_id, role="user", content="是啊，我也是，我现在在学校参加了排球队，前几天还代表学校参加全国比赛，拿了第二名呢！")
    # message_id11 = insert_message(user_id=user_id, role="assistant", content="那真是太棒了，是在哪里参加的比赛？")
    # message_id12 = insert_message(user_id=user_id, role="user", content="是在北京举办的全国大学生排球比赛")
    # message_id13 = insert_message(user_id=user_id, role="assistant", content="不错，有没有好好玩一下北京？")
    # message_id14 = insert_message(user_id=user_id, role="user", content="当然，打完比赛就去玩了，参观了天安门、故宫、长城这里的景点场所，长城爬的累死了，还被我的队友嘲笑了，因为他们体力都特别好")
    # message_id15 = insert_message(user_id=user_id, role="assistant", content="真不错啊，玩了几天呀？")
    # message_id16 = insert_message(user_id=user_id, role="user", content="玩了三天，昨天刚回来了")
    # message_id17 = insert_message(user_id=user_id, role="assistant", content="哈哈，比赛一天玩三天，也是很享福了")
    # message_id18 = insert_message(user_id=user_id, role="user", content="虽然比赛一天，但是我们其实提前整整一星期就到北京了，训练了一周适应，然后比赛的")

