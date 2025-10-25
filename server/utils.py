from typing import List, Dict, Any, Callable, TypeVar, Optional, Tuple
import re
import asyncio
import functools
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
import os

# 导入日志配置
from config import (
    LOG_DIR_NAME,
    LOG_LEVEL as LOG_LEVEL_STR,
    LOG_DEBUG_MAX_BYTES,
    LOG_DEBUG_BACKUP_COUNT,
    LOG_INFO_MAX_BYTES,
    LOG_INFO_BACKUP_COUNT,
    LOG_WARNING_MAX_BYTES,
    LOG_WARNING_BACKUP_COUNT
)

# 类型变量（用于装饰器类型提示）
T = TypeVar('T')

# ============================================
# 日志配置系统
# ============================================

# 日志格式（固定不变，无需配置）
LOG_FORMAT = '%(asctime)s [%(levelname)8s] [%(name)s] %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# 计算日志目录路径
LOG_DIR = os.path.join(os.path.dirname(__file__), LOG_DIR_NAME)

# 将字符串形式的日志级别转换为 logging 常量
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.DEBUG)

# 存储已配置的 logger（避免重复配置）
_configured_loggers = set()


class LazyRotatingFileHandler(RotatingFileHandler):
    """
    延迟初始化的 RotatingFileHandler
    
    特性：
        - 在第一次写入日志时才创建文件（避免产生空文件）
        - 继承所有 RotatingFileHandler 的功能（自动轮转、备份等）
    """
    def __init__(self, filename, mode='a', maxBytes=0, backupCount=0, encoding=None, delay=True):
        """
        参数:
            filename: 日志文件路径
            mode: 文件打开模式（默认 'a' 追加）
            maxBytes: 最大字节数（超过后轮转）
            backupCount: 备份文件数量
            encoding: 文件编码（默认 'utf-8'）
            delay: 是否延迟创建文件（强制为 True）
        """
        # 确保目录存在
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # 调用父类初始化，delay=True 会延迟文件创建
        super().__init__(
            filename=filename,
            mode=mode,
            maxBytes=maxBytes,
            backupCount=backupCount,
            encoding=encoding,
            delay=True  # 关键：延迟文件创建，直到第一次 emit
        )


def setup_logger(name: str, log_file: Optional[str] = None, level: int = LOG_LEVEL) -> logging.Logger:
    """
    为指定模块配置独立的日志器（三文件系统）
    
    参数:
        name: logger 名称（如 'db_client', 'openai_client'）
        log_file: 主日志文件名（如 'db_client.log'），不提供则使用 name.log
        level: 日志级别（默认 DEBUG）
    
    返回:
        配置好的 logger 实例
    
    特性:
        - 三文件日志系统（按需创建，避免空文件）：
          * DEBUG 日志 → logs/debug/{name}.log（50MB × 3 备份）
          * INFO 日志 → logs/info/{name}.log（10MB × 3 备份）
          * WARNING/ERROR/CRITICAL 日志 → logs/warning/{name}.log（10MB × 3 备份）
        - 日志轮转（自动管理文件大小）
        - 同时输出到控制台（便于开发）
        - 统一的日志格式
    """
    # 避免重复配置
    if name in _configured_loggers:
        return logging.getLogger(name)
    
    # 创建 logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False  # 不向父 logger 传播
    
    # 确定日志文件名（不带扩展名）
    if log_file is None:
        base_name = name
    else:
        # 移除 .log 扩展名（如果有）
        base_name = log_file.replace('.log', '')
    
    # 创建格式化器
    formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
    
    # 1. DEBUG 日志处理器（存储到 logs/debug/ 目录）
    debug_log_path = os.path.join(LOG_DIR, 'debug', f"{base_name}.log")
    debug_handler = LazyRotatingFileHandler(
        debug_log_path,
        maxBytes=LOG_DEBUG_MAX_BYTES,
        backupCount=LOG_DEBUG_BACKUP_COUNT,
        encoding='utf-8'
    )
    debug_handler.setLevel(logging.DEBUG)
    debug_handler.addFilter(lambda record: record.levelno == logging.DEBUG)  # 过滤器：只允许 DEBUG
    debug_handler.setFormatter(formatter)
    logger.addHandler(debug_handler)
    
    # 2. INFO 日志处理器（存储到 logs/info/ 目录）
    info_log_path = os.path.join(LOG_DIR, 'info', f"{base_name}.log")
    info_handler = LazyRotatingFileHandler(
        info_log_path,
        maxBytes=LOG_INFO_MAX_BYTES,
        backupCount=LOG_INFO_BACKUP_COUNT,
        encoding='utf-8'
    )
    info_handler.setLevel(logging.INFO)
    info_handler.addFilter(lambda record: record.levelno == logging.INFO)  # 过滤器：只允许 INFO
    info_handler.setFormatter(formatter)
    logger.addHandler(info_handler)
    
    # 3. WARNING/ERROR/CRITICAL 日志处理器（存储到 logs/warning/ 目录）
    warning_log_path = os.path.join(LOG_DIR, 'warning', f"{base_name}.log")
    warning_handler = LazyRotatingFileHandler(
        warning_log_path,
        maxBytes=LOG_WARNING_MAX_BYTES,
        backupCount=LOG_WARNING_BACKUP_COUNT,
        encoding='utf-8'
    )
    warning_handler.setLevel(logging.WARNING)  # WARNING/ERROR/CRITICAL
    warning_handler.setFormatter(formatter)
    logger.addHandler(warning_handler)
    
    # 4. 控制台处理器（便于开发调试，显示所有级别）
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 标记为已配置
    _configured_loggers.add(name)
    
    return logger

# 为 utils 模块自身创建 logger
logger = setup_logger('utils')


# ============================================
# 异步重试装饰器
# ============================================

def retry_async(
    exceptions: Tuple[type, ...] = (Exception,),
    max_tries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    logger_name: Optional[str] = None,
    on_retry: Optional[Callable] = None
):
    """
    异步函数重试装饰器（基于 backoff 库的最佳实践）
    
    参数:
        exceptions: 需要重试的异常类型元组（默认所有异常）
        max_tries: 最大尝试次数（包括首次调用，默认 3）
        initial_delay: 初始延迟时间（秒，默认 1.0）
        backoff_factor: 指数退避因子（默认 2.0，每次重试延迟翻倍）
        max_delay: 最大延迟时间（秒，默认 60）
        jitter: 是否添加随机抖动（默认 True，避免惊群效应）
        logger_name: 自定义 logger 名称（默认使用 'utils'）
        on_retry: 重试时的回调函数（接收 details 字典）
    
    用法:
        @retry_async(exceptions=(asyncpg.PostgresError,), max_tries=3)
        async def query_database():
            # your code
    
    特性:
        - 指数退避（exponential backoff）
        - 可选随机抖动（jitter）
        - 详细日志记录
        - 自定义重试回调
    """
    # 使用自定义 logger 或默认 logger
    # 如果指定了 logger_name，使用 setup_logger 配置该模块的日志
    retry_logger = setup_logger(logger_name) if logger_name else logger
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, max_tries + 1):
                try:
                    # 尝试执行函数
                    return await func(*args, **kwargs)
                    
                except exceptions as e:
                    last_exception = e
                    
                    # 如果是最后一次尝试，直接抛出异常
                    if attempt >= max_tries:
                        retry_logger.error(
                            f"❌ {func.__name__} 重试失败（已达最大次数 {max_tries}）: {e}"
                        )
                        raise
                    
                    # 计算退避时间（指数退避）
                    delay = min(initial_delay * (backoff_factor ** (attempt - 1)), max_delay)
                    
                    # 添加随机抖动（±25%）
                    if jitter:
                        import random
                        jitter_range = delay * 0.25
                        delay = delay + random.uniform(-jitter_range, jitter_range)
                    
                    # 准备详情字典（用于日志和回调）
                    details = {
                        'target': func.__name__,
                        'args': args,
                        'kwargs': kwargs,
                        'tries': attempt,
                        'exception': e,
                        'wait': delay,
                        'max_tries': max_tries
                    }
                    
                    # 记录重试日志
                    retry_logger.warning(
                        f"⚠️ {func.__name__} 第 {attempt}/{max_tries} 次尝试失败: {e}. "
                        f"将在 {delay:.1f} 秒后重试..."
                    )
                    
                    # 调用自定义回调（如果提供）
                    if on_retry:
                        on_retry(details)
                    
                    # 等待后重试
                    await asyncio.sleep(delay)
            
            # 理论上不会执行到这里（for 循环中已经 raise）
            raise last_exception
        
        return wrapper
    return decorator



