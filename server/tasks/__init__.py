"""
业务任务模块

包含：

# context_builder: LLM上下文构建器（异步版本）
- 并行获取用户数据、记忆、角色信息、知识库
- 构建三层记忆上下文（短期 + 语义 + 情景）
- 组装完整的 LLM Messages 数组

# episodic_extractor: 提取情景记忆
- 作为异步后台任务执行，不阻塞对话
- 根据未处理消息提取重要事件
- 触发向量化（通过数据库触发器自动完成）

# profile_updater: 更新用户画像
- 作为异步后台任务执行，不阻塞对话
- 根据未处理消息更新用户画像
- 使用乐观锁防止并发冲突

"""

import sys
import os

# 将父目录添加到 Python 路径，使子模块能导入 config 和 utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

