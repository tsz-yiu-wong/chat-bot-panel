"""
向量检索客户端（asyncpg 异步版本）

职责：
- 对 Character、Knowledge、Episodic 进行向量检索
- 使用 asyncpg 替代 Supabase SDK
- 在 Python 层面计算余弦相似度
"""

import os
import sys
from typing import List, Dict, Any
import json
import asyncpg

# 添加父目录到路径，确保能导入 config 和同级模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from clients import openai_client, db_client
from utils import retry_async, setup_logger

# 日志器
logger = setup_logger('vector_search')


# ============================================
# 辅助函数
# ============================================

def parse_embedding(embedding: Any) -> List[float]:
    """
    解析 PostgreSQL 返回的 embedding 数据
    
    PostgreSQL 将 vector 类型存储为数组，可能需要解析
    
    参数:
        embedding: 可能是字符串、列表或其他类型
    
    返回:
        浮点数列表
    """
    if embedding is None:
        return []
    
    # 如果已经是列表，直接返回
    if isinstance(embedding, list):
        return embedding
    
    # 如果是字符串，解析 JSON
    if isinstance(embedding, str):
        try:
            # PostgreSQL 可能返回 "[1.0, 2.0, ...]" 格式
            parsed = json.loads(embedding)
            if isinstance(parsed, list):
                return parsed
            return []
        except json.JSONDecodeError:
            return []
    
    return []


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    计算两个向量的余弦相似度
    
    参数:
        vec1: 向量1
        vec2: 向量2
    
    返回:
        相似度分数（0-1之间）
    """
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    # 计算点积
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # 计算向量的模
    norm1 = sum(a * a for a in vec1) ** 0.5
    norm2 = sum(b * b for b in vec2) ** 0.5
    
    # 避免除以零
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)


# ============================================
# Episodic 向量检索
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='vector_search'
)
async def search_episodic_memories(
    user_id: str,
    query_embedding: List[float],
    top_k: int,
    min_similarity: float
) -> List[Dict[str, Any]]:
    """
    向量检索相关的情景记忆（在 server 层面完成）
    
    参数:
        user_id: 用户 UUID
        query_embedding: 查询向量（预生成，避免重复调用 OpenAI API）
        top_k: 返回数量
        min_similarity: 最低相似度（余弦相似度，0-1之间）
    
    返回:
        记忆列表，包含 id, content, importance_score, created_at, similarity
    
    执行流程:
        1. 从数据库获取该用户的 episodic memories（已过滤低重要性记忆）
        2. 在 Python 中计算相似度
        3. 过滤、排序并返回 top_k 结果
        4. 更新访问记录
    """
    # 验证 embedding
    if not query_embedding:
        return []
    
    # 1. 从数据库获取所有该用户的 episodic memories（检索时过滤低重要性记忆）
    pool = db_client.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, content, importance_score, created_at, embedding
            FROM chat_users_episodic_memories
            WHERE user_id = $1 
              AND importance_score >= $2
              AND embedding IS NOT NULL
            """,
            user_id,
            config.EPISODIC_IMPORTANCE_SEARCH_THRESHOLD
        )
    
    if not rows:
        return []
    
    # 2. 计算相似度并过滤
    results_with_similarity = []
    for row in rows:
        if not row['embedding']:
            continue
        
        # 解析 embedding
        item_embedding = parse_embedding(row['embedding'])
        if not item_embedding:
            continue
        
        # 计算余弦相似度
        similarity = cosine_similarity(query_embedding, item_embedding)
        
        # 过滤低于阈值的结果
        if similarity >= min_similarity:
            results_with_similarity.append({
                "id": row['id'],
                "content": row['content'],
                "importance_score": row['importance_score'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                "similarity": similarity
            })
    
    # 3. 按相似度降序排序，返回 top_k
    results_with_similarity.sort(key=lambda x: x["similarity"], reverse=True)
    top_results = results_with_similarity[:top_k]
    
    # 4. 更新访问记录
    if top_results:
        memory_ids = [r["id"] for r in top_results]
        # 批量更新访问计数和时间
        async with pool.acquire() as conn:
            for memory_id in memory_ids:
                try:
                    await conn.execute(
                        "SELECT increment_episodic_access($1)",
                        memory_id
                    )
                except Exception as e:
                    logger.warning(f"更新情景记忆访问记录失败 | memory_id={memory_id} | error={str(e)}")
    
    return top_results


# ============================================
# Character 向量检索
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='vector_search'
)
async def search_character_vectors(
    character_id: str,
    query_embedding: List[float],
    top_k: int,
    min_similarity: float
) -> List[Dict[str, Any]]:
    """
    向量检索匹配的 Character Facets（在 server 层面完成）
    
    参数:
        character_id: 角色 UUID
        query_embedding: 查询向量（预生成，避免重复调用 OpenAI API）
        top_k: 返回数量
        min_similarity: 最低相似度（余弦相似度，0-1之间）
    
    返回:
        人设维度列表，包含 facet, content, language, similarity
    
    执行流程:
        1. 从数据库获取所有 character vectors
        2. 在 Python 中计算相似度
        3. 过滤、排序并返回 top_k 结果
    """
    # 验证 embedding
    if not query_embedding:
        return []
    
    # 1. 从数据库获取所有该 character 的 vectors
    pool = db_client.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT facet, content, language, embedding
            FROM character_vectors
            WHERE character_id = $1 
              AND is_deleted = false
              AND embedding IS NOT NULL
            """,
            character_id
        )
    
    if not rows:
        return []
    
    # 3. 计算相似度并过滤
    results_with_similarity = []
    for row in rows:
        if not row['embedding']:
            continue
        
        # 解析 embedding
        item_embedding = parse_embedding(row['embedding'])
        if not item_embedding:
            continue
        
        # 计算余弦相似度
        similarity = cosine_similarity(query_embedding, item_embedding)
        
        # 过滤低于阈值的结果
        if similarity >= min_similarity:
            results_with_similarity.append({
                "facet": row['facet'],
                "content": row['content'],
                "language": row['language'],
                "similarity": similarity
            })
    
    # 3. 按相似度降序排序，返回 top_k
    results_with_similarity.sort(key=lambda x: x["similarity"], reverse=True)
    return results_with_similarity[:top_k]


# ============================================
# Knowledge 向量检索
# ============================================

@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='vector_search'
)
async def search_knowledge_scripts(
    query_embedding: List[float],
    language: str,
    top_k: int,
    min_similarity: float
) -> List[Dict[str, Any]]:
    """
    向量检索相关的话术库（Script）（在 server 层面完成）
    
    参数:
        query_embedding: 查询向量（预生成，避免重复调用 OpenAI API）
        language: 语言代码（zh, en, vi）
        top_k: 返回数量
        min_similarity: 最低相似度（余弦相似度，0-1之间）
    
    返回:
        话术列表，包含 user_text, answer_text, similarity
    
    执行流程:
        1. 从数据库获取所有话术库向量（JOIN knowledge_items 和 knowledge_vectors）
        2. 在 Python 中计算相似度
        3. 过滤、排序并返回 top_k 结果
    """
    # 验证 embedding
    if not query_embedding:
        return []
    
    # 1. 从数据库获取话术库数据（需要 JOIN）
    pool = db_client.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT ki.user_text, ki.answer_text, kv.embedding
            FROM knowledge_items ki
            JOIN knowledge_vectors kv ON ki.id = kv.item_id
            WHERE ki.knowledge_type = 'script'
              AND ki.language = $1
              AND ki.is_deleted = false
              AND kv.is_deleted = false
              AND kv.embedding IS NOT NULL
            """,
            language
        )
    
    if not rows:
        return []
    
    # 3. 计算相似度并过滤
    results_with_similarity = []
    for row in rows:
        if not row['embedding']:
            continue
        
        # 解析 embedding
        item_embedding = parse_embedding(row['embedding'])
        if not item_embedding:
            continue
        
        # 计算余弦相似度
        similarity = cosine_similarity(query_embedding, item_embedding)
        
        # 过滤低于阈值的结果
        if similarity >= min_similarity:
            results_with_similarity.append({
                "user_text": row['user_text'],
                "answer_text": row['answer_text'],
                "similarity": similarity
            })
    
    # 3. 按相似度降序排序，返回 top_k
    results_with_similarity.sort(key=lambda x: x["similarity"], reverse=True)
    return results_with_similarity[:top_k]


@retry_async(
    exceptions=(asyncpg.PostgresError,),
    max_tries=3,
    initial_delay=0.5,
    logger_name='vector_search'
)
async def search_knowledge_abbreviations(
    query_embedding: List[float],
    language: str,
    top_k: int,
    min_similarity: float
) -> List[Dict[str, Any]]:
    """
    向量检索相关的缩写库（Abbreviation）（在 server 层面完成）
    
    参数:
        query_embedding: 查询向量（预生成，避免重复调用 OpenAI API）
        language: 语言代码（zh, en, vi）
        top_k: 返回数量
        min_similarity: 最低相似度（余弦相似度，0-1之间）
    
    返回:
        缩写列表，包含 abbreviation, full_form, description, similarity
    
    执行流程:
        1. 从数据库获取所有缩写库向量（JOIN knowledge_items 和 knowledge_vectors）
        2. 在 Python 中计算相似度
        3. 过滤、排序并返回 top_k 结果
    """
    # 验证 embedding
    if not query_embedding:
        return []
    
    # 1. 从数据库获取缩写库数据（需要 JOIN）
    pool = db_client.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT ki.abbreviation, ki.full_form, ki.description, kv.embedding
            FROM knowledge_items ki
            JOIN knowledge_vectors kv ON ki.id = kv.item_id
            WHERE ki.knowledge_type = 'abbreviation'
              AND ki.language = $1
              AND ki.is_deleted = false
              AND kv.is_deleted = false
              AND kv.embedding IS NOT NULL
            """,
            language
        )
    
    if not rows:
        return []
    
    # 3. 计算相似度并过滤
    results_with_similarity = []
    for row in rows:
        if not row['embedding']:
            continue
        
        # 解析 embedding
        item_embedding = parse_embedding(row['embedding'])
        if not item_embedding:
            continue
        
        # 计算余弦相似度
        similarity = cosine_similarity(query_embedding, item_embedding)
        
        # 过滤低于阈值的结果
        if similarity >= min_similarity:
            results_with_similarity.append({
                "abbreviation": row['abbreviation'],
                "full_form": row['full_form'],
                "description": row.get('description'),
                "similarity": similarity
            })
    
    # 3. 按相似度降序排序，返回 top_k
    results_with_similarity.sort(key=lambda x: x["similarity"], reverse=True)
    return results_with_similarity[:top_k]


# ============================================
# 测试代码
# ============================================

if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 初始化数据库连接池
        await db_client.init_pool()
        
        try:
            
            # 预先生成 embedding（模拟真实场景）
            query = "好巧啊，我也在上学！你是什么学校什么专业的啊"
            print(f"\n生成 query embedding: {query}")
            query_embedding = await openai_client.generate_embedding(query)
            print(f"Embedding 维度: {len(query_embedding)}")
            
            # 测试 Character 向量检索
            print("\n=== 测试 Character 向量检索 ===")
            result = await search_character_vectors(
                character_id="d2ee58d8-8823-4f5a-aef4-2774d1d7a8f7",
                query_embedding=query_embedding,
                top_k=3,
                min_similarity=0.1
            )
            print(f"Found {len(result)} character facets")
            for item in result:
                print(f"  - {item['facet']}: {item['similarity']:.3f}")
            '''
            # 测试 Script 向量检索
            query2 = "我不知道该不该去上班"
            query2_embedding = await openai_client.generate_embedding(query2)
            print(f"\n=== 测试 Script 向量检索 ===")
            result = await search_knowledge_scripts(
                query_embedding=query2_embedding,
                language="zh",
                top_k=3,
                min_similarity=0.1
            )
            print(f"Found {len(result)} scripts")
            for item in result:
                print(f"  - Similarity: {item['similarity']:.3f}")
                print(f"    User: {item['user_text'][:50]}...")
            
            # 测试 Abbreviation 向量检索
            query3 = "ok, 2v1也可以"
            query3_embedding = await openai_client.generate_embedding(query3)
            print(f"\n=== 测试 Abbreviation 向量检索 ===")
            result = await search_knowledge_abbreviations(
                query_embedding=query3_embedding,
                language="zh",
                top_k=5,
                min_similarity=0.1
            )
            print(f"Found {len(result)} abbreviations")
            for item in result:
                print(f"  - {item['abbreviation']}: {item['full_form']} ({item['similarity']:.3f})")
            
            # 测试 Episodic 向量检索
            query4 = "你喜欢北京吗?"
            query4_embedding = await openai_client.generate_embedding(query4)
            print(f"\n=== 测试 Episodic 向量检索 ===")
            result = await search_episodic_memories(
                user_id="24f8ed57-423c-4955-ac13-cb75de237b41",
                query_embedding=query4_embedding,
                top_k=3,
                min_similarity=0.1
            )
            print(f"Found {len(result)} episodic memories")
            for item in result:
                print(f"  - Similarity: {item['similarity']:.3f}")
                print(f"    Content: {item['content'][:50]}...")
            '''
        finally:
            # 关闭连接池
            await db_client.close_pool()
    
    # 运行测试
    asyncio.run(test())
