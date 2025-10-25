"""
客户端模块

包含：

# db_client: 数据库操作客户端
- 封装所有数据库查询和写入操作（不包含向量检索）
- 管理 PostgreSQL 连接池
- 提供用户、消息、Profile、Episodic、Prompt、Character 等数据操作接口
- 提供所有数据库操作的异步接口

# openai_client: OpenAI API 客户端
- 封装 OpenAI API 调用（用于 Profile Update、Episodic 提取、Embedding 生成）
- 对话生成由 index.py 直接调用自建 LLM

# vector_search: 向量检索模块
- 在 Python 层面计算余弦相似度
- 对 Character、Knowledge、Episodic 进行向量检索
"""

import sys
import os

# 将父目录添加到 Python 路径，使子模块能导入 config 和 utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

