import os
from dotenv import load_dotenv

load_dotenv()

# ============================================
# 日志系统配置
# ============================================

# 日志目录（相对于 server/ 目录）
LOG_DIR_NAME = 'logs'

# 默认日志级别（字符串形式：DEBUG, INFO, WARNING, ERROR, CRITICAL）
LOG_LEVEL = "DEBUG"

# DEBUG 日志文件配置（单独存储，容量更大）
LOG_DEBUG_MAX_BYTES = 50 * 1024 * 1024  # 50MB
LOG_DEBUG_BACKUP_COUNT = 3  # 保留 3 个备份

# INFO 日志文件配置
LOG_INFO_MAX_BYTES = 10 * 1024 * 1024  # 10MB
LOG_INFO_BACKUP_COUNT = 3  # 保留 3 个备份

# WARNING/ERROR/CRITICAL 日志文件配置
LOG_WARNING_MAX_BYTES = 10 * 1024 * 1024  # 10MB
LOG_WARNING_BACKUP_COUNT = 3  # 保留 3 个备份



# ============================================
# 数据库配置
# ============================================

# PostgreSQL 直连配置（asyncpg）
POSTGRES_URI = os.getenv("POSTGRES_IPV4_URI")
if not POSTGRES_URI:
    raise ValueError("必须设置 POSTGRES_IPV4_URI 环境变量")

# 连接池配置
DATABASE_POOL_MIN_SIZE = 10  # 最小连接数
DATABASE_POOL_MAX_SIZE = 20  # 最大连接数
DATABASE_POOL_TIMEOUT = 30   # 连接超时（秒）

# ============================================
# 【已废弃】Supabase SDK 配置（改用 asyncpg 直连）
# ============================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")



# ============================================
# LLM 配置
# ============================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("必须设置 OPENAI_API_KEY 环境变量")

# 默认使用的 LLM 模型
DEFAULT_MODEL = "gpt-5-mini"

# 向量嵌入模型
EMBEDDING_MODEL = "text-embedding-3-small"



# ============================================
# 记忆参数配置
# ============================================
# 短期记忆保留的消息条数
RECENT_MESSAGES_LIMIT = 20

# 情景记忆重要性阈值（两阶段过滤）
EPISODIC_IMPORTANCE_WRITE_THRESHOLD = 0.3   # 写入控制：低于此分数的记忆不写入数据库（宽松）
EPISODIC_IMPORTANCE_SEARCH_THRESHOLD = 0.5  # 检索控制：检索时过滤低于此分数的记忆（严格）

# Episodic 去重的相似度阈值（相似度超过此值时判定为重复）
EPISODIC_DEDUP_SIMILARITY = 0.8


# ============================================
# 记忆分析触发阈值配置
# ============================================
# 触发记忆分析的消息数阈值（未处理消息达到此数量时触发）
MEMORY_ANALYSIS_COUNT_THRESHOLD = RECENT_MESSAGES_LIMIT - 2

# 触发记忆分析的时间阈值（分钟，距离上次消息超过此时间且有未处理消息时触发）
MEMORY_ANALYSIS_TIME_THRESHOLD = 30

# 触发记忆分析的最小消息数（未处理消息至少要有这么多条才会触发）
MEMORY_ANALYSIS_MIN_MESSAGES = 6

# 最大未处理消息数（达到后强制跳过最旧的消息，避免卡死）
MEMORY_ANALYSIS_MAX_MESSAGES = RECENT_MESSAGES_LIMIT + 10
MEMORY_ANALYSIS_FORCE_MARK_OLD_MESSAGES_COUNT = 4


# ============================================
# 向量检索配置
# ============================================

# Episodic 向量检索
VECTOR_SEARCH_EPISODIC_TOP_K = 5
VECTOR_SEARCH_EPISODIC_MIN_SIMILARITY = 0.35  # 最低相似度

# Character 向量检索
VECTOR_SEARCH_CHARACTER_TOP_K = 3
VECTOR_SEARCH_CHARACTER_MIN_SIMILARITY = 0.3  # 最低相似度

# Knowledge - Script（话术库）向量检索
VECTOR_SEARCH_SCRIPT_TOP_K = 1
VECTOR_SEARCH_SCRIPT_MIN_SIMILARITY = 0.5  # 话术匹配要求更高相似度

# Knowledge - Abbreviation（缩写库）向量检索
VECTOR_SEARCH_ABBREVIATION_TOP_K = 5
VECTOR_SEARCH_ABBREVIATION_MIN_SIMILARITY = 0.35  # 缩写匹配中等相似度



# ============================================
# 默认值配置（按语言分类）
# ============================================
# 新用户默认角色 UUID（按语言区分）
DEFAULT_CHARACTER_ID = {
    "zh": "d2ee58d8-8823-4f5a-aef4-2774d1d7a8f7",  # 小明（中文）
    "en": "bc32a6a8-8444-4d7f-a143-bc3baff20278",  # Tom（英文）
    "vi": "7e8e627c-ef25-42f7-9bac-8fb2de390ab4",  # Trần Ngọc Kim Oanh （越南文）
}

# 新用户默认 Stage UUID（全局统一，不分语言）
# 注意：同一个 Stage 下的 Prompt 会有不同语言版本，但 Stage ID 本身不分语言
DEFAULT_STAGE_ID = "f7181b77-30f2-4919-84ae-aa85c10c9823"  # Stage 1


def get_default_character_id(language: str) -> str:
    """
    根据语言获取默认角色 ID
    
    参数:
        language: 语言代码（zh, en, vi）
    
    返回:
        角色 UUID
    """
    return DEFAULT_CHARACTER_ID.get(language, DEFAULT_CHARACTER_ID.get("en"))

