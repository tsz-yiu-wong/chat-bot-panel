import os
import sys
from typing import List, Dict
import time
import asyncio

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config
from clients import db_client, vector_search
from utils import setup_logger

# 日志器
logger = setup_logger('context_builder')

SYSTEM_ROLE_PROMPT_TEMPLATE_EN = "{stage_prompt}\n\n# Your Character Information\n{character_facets}\n\n# User Information\n## User Profile\n{profile}\n\n## User Episodic Memories\n{episodic_memories}\n\n# Reference Information\n## Scripts Knowledge Base\n{scripts}\n\n## Abbreviations Knowledge Base\n{abbreviations}"

SYSTEM_ROLE_PROMPT_TEMPLATE_ZH = "{stage_prompt}\n\n# 你的角色信息\n{character_facets}\n\n# 用户信息\n## 用户画像\n{profile}\n\n## 用户情景记忆\n{episodic_memories}\n\n# 参考信息\n## 话术知识库\n{scripts}\n\n## 缩写知识库\n{abbreviations}"

SYSTEM_ROLE_PROMPT_TEMPLATE_VI = "{stage_prompt}\n\n# Thông tin nhân vật của bạn\n{character_facets}\n\n# Thông tin người dùng\n## Hồ sơ người dùng\n{profile}\n\n## Ký ức tình huống của người dùng\n{episodic_memories}\n\n# Thông tin tham khảo\n## Cơ sở kiến thức kịch bản\n{scripts}\n\n## Cơ sở kiến thức từ viết tắt\n{abbreviations}"


# ============================================
# 无数据提示消息定义
# ============================================
NO_DATA_MESSAGES = {
    'profile': {
        'en': 'No profile available',
        'zh': '暂无用户画像',
        'vi': 'Chưa có hồ sơ'
    },
    'episodic': {
        'en': 'No related episodic memories',
        'zh': '暂无相关情景记忆',
        'vi': 'Không có ký ức tình huống liên quan'
    },
    'character': {
        'en': 'No character information',
        'zh': '暂无角色信息',
        'vi': 'Không có thông tin nhân vật'
    },
    'script': {
        'en': 'No script references',
        'zh': '暂无话术参考',
        'vi': 'Không có kịch bản tham khảo'
    },
    'abbreviation': {
        'en': 'No abbreviation references',
        'zh': '暂无缩写参考',
        'vi': 'Không có từ viết tắt tham khảo'
    }
}


def _format_profile(data: str, language: str) -> str:
    """格式化用户画像"""
    return f"- {data}"


def _format_episodic(data: List[Dict], language: str) -> str:
    """格式化情景记忆"""
    label_importance = {
        'en': 'Importance',
        'zh': '情景重要性',
        'vi': 'Mức độ quan trọng'
    }
    importance_label = label_importance.get(language, 'Importance')
    
    formatted_items = []
    for item in data:
        content = item.get('content', '')
        importance_score = item.get('importance_score', 0)
        if content:
            formatted_items.append(f"- 【{importance_label}：{importance_score}】{content}")
    
    return '\n'.join(formatted_items) if formatted_items else NO_DATA_MESSAGES['episodic'].get(language, 'No data')


def _format_character(data: List[Dict], language: str) -> str:
    """格式化角色信息：一个 facet 一个段落，bullet points 之间用分号分隔"""
    formatted_items = []
    
    for item in data:
        content = item.get('content', '')
        if not content:
            continue
        
        # 将 content 按行分割
        lines = content.strip().split('\n')
        if len(lines) == 0:
            continue
        
        # 第一行是标题（如：你的地理位置：）
        title = lines[0].strip()
        
        # 后面的行是 bullet points，去掉 "- " 前缀并合并
        details = []
        current_detail = ""
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
            
            # 如果以 "- " 开头，说明是新的一个细节项
            if line.startswith('- '):
                # 保存之前的细节项
                if current_detail:
                    details.append(current_detail.strip())
                # 开始新的细节项（去掉 "- " 前缀）
                current_detail = line[2:]
            elif line.startswith('-'):
                # 保存之前的细节项
                if current_detail:
                    details.append(current_detail.strip())
                # 开始新的细节项（去掉 "-" 前缀）
                current_detail = line[1:].strip()
            else:
                # 不是新的细节项，是上一个细节项的延续
                if current_detail:
                    current_detail += line
                else:
                    current_detail = line
        
        # 保存最后一个细节项
        if current_detail:
            details.append(current_detail.strip())
        
        # 合并成一个段落：用分号分隔，最后一项用句号结尾
        # - 标题 详细内容1; 详细内容2; 详细内容3.
        if details:
            # 给每个细节项添加适当的结尾标点（最后一项用句号，其他用分号）
            for i in range(len(details)):
                details[i] = details[i] + (';' if i < len(details) - 1 else '.')
            
            combined_details = ' '.join(details)
            formatted_items.append(f"- {title} {combined_details}")
    
    return '\n'.join(formatted_items) if formatted_items else NO_DATA_MESSAGES['character'].get(language, 'No data')


def _format_script(data: List[Dict], language: str) -> str:
    """格式化话术知识库"""
    label_if = {'en': 'If user says', 'zh': '如果用户说', 'vi': 'Nếu người dùng nói'}
    label_you = {'en': 'You answer', 'zh': '你回答', 'vi': 'Bạn trả lời'}
    if_label = label_if.get(language, 'If user says')
    you_label = label_you.get(language, 'You answer')
    
    formatted_items = []
    for item in data:
        user_text = item.get('user_text', '')
        answer_text = item.get('answer_text', '')
        if user_text or answer_text:
            formatted_items.append(f'- {if_label}: "{user_text}". {you_label}: "{answer_text}"')
    
    return '\n'.join(formatted_items) if formatted_items else NO_DATA_MESSAGES['script'].get(language, 'No data')


def _format_abbreviation(data: List[Dict], language: str) -> str:
    """格式化缩写知识库"""
    formatted_items = []
    
    for item in data:
        abbreviation = item.get('abbreviation', '')
        full_form = item.get('full_form', '')
        description = item.get('description', '')
        
        if abbreviation and full_form:
            if description:
                formatted_items.append(f"- {abbreviation} = {full_form}（{description}）")
            else:
                formatted_items.append(f"- {abbreviation} = {full_form}")
    
    return '\n'.join(formatted_items) if formatted_items else NO_DATA_MESSAGES['abbreviation'].get(language, 'No data')


async def build_messages_for_chat(user_id: str, current_query: str) -> List[Dict[str, str]]:
    """
    一站式构建 LLM Messages 数组，包含三层记忆 + Character + 知识库 + 历史对话
    
    参数:
        user_id: 用户 UUID
        current_query: 用户当前消息
    
    返回:
        符合 OpenAI API 标准的 Messages 数组
    
    性能优化：
        - 步骤 2、3、4 的 7 个 I/O 操作并行执行
        - 预期性能提升：60%+
    """
    
    # ============================================
    # 步骤 1-2: 并行获取用户信息 + 生成 Embedding
    # ============================================
    timestamp_init = time.time()
    from clients import openai_client
    
    user_info, query_embedding = await asyncio.gather(
        db_client.get_user_info(user_id=user_id),
        openai_client.generate_embedding(current_query)
    )
    
    if not user_info:
        raise ValueError(f"用户不存在: user_id={user_id}")
    
    character_id = user_info['character_id']
    stage_id = user_info['current_stage_id']
    language = user_info['language']
    
    time_step1_2 = time.time() - timestamp_init
    
    # ============================================
    # 步骤 3-4-5: 并行执行所有 I/O 操作
    # ============================================
    timestamp_parallel = time.time()
    
    # 并行执行 7 个独立的 I/O 操作
    (
        recent_messages,
        profile_data,
        related_episodic_memories,
        stage_prompt_data,
        character_facets,
        scripts,
        abbreviations
    ) = await asyncio.gather(
        # 步骤 3: 获取最近对话、用户画像、情景记忆
        db_client.get_recent_messages(user_id=user_id, limit=config.RECENT_MESSAGES_LIMIT),
        db_client.get_profile_with_timestamp(user_id=user_id),
        vector_search.search_episodic_memories(user_id=user_id, query_embedding=query_embedding, top_k=config.VECTOR_SEARCH_EPISODIC_TOP_K, min_similarity=config.VECTOR_SEARCH_EPISODIC_MIN_SIMILARITY),
        
        # 步骤 4: 获取阶段 Prompt
        db_client.get_prompt(stage_id=stage_id, language=language),
        
        # 步骤 5: 向量检索 Character、Script、Abbreviation（传入预生成的 embedding）
        vector_search.search_character_vectors(
            character_id=character_id,
            query_embedding=query_embedding,
            top_k=config.VECTOR_SEARCH_CHARACTER_TOP_K,
            min_similarity=config.VECTOR_SEARCH_CHARACTER_MIN_SIMILARITY
        ),
        vector_search.search_knowledge_scripts(
            query_embedding=query_embedding,
            language=language,
            top_k=config.VECTOR_SEARCH_SCRIPT_TOP_K,
            min_similarity=config.VECTOR_SEARCH_SCRIPT_MIN_SIMILARITY
        ),
        vector_search.search_knowledge_abbreviations(
            query_embedding=query_embedding,
            language=language,
            top_k=config.VECTOR_SEARCH_ABBREVIATION_TOP_K,
            min_similarity=config.VECTOR_SEARCH_ABBREVIATION_MIN_SIMILARITY
        )
    )
    
    time_step3_5 = time.time() - timestamp_parallel

    # ============================================
    # 步骤 6: 处理并行结果（使用格式化函数）
    # ============================================
    timestamp_process = time.time()
    
    # 处理 recent_messages
    if not recent_messages:
        recent_messages = []
    
    # 处理 stage_prompt
    if not stage_prompt_data:
        stage_prompt = "No stage prompt"
    else:
        stage_prompt = stage_prompt_data['prompt']
    
    # 使用格式化函数处理所有参考数据
    profile, _ = profile_data
    profile = _format_profile(profile, language) if profile else NO_DATA_MESSAGES['profile'].get(language, 'No data')
    episodic_memories = _format_episodic(related_episodic_memories, language) if related_episodic_memories else NO_DATA_MESSAGES['episodic'].get(language, 'No data')
    character_facets = _format_character(character_facets, language) if character_facets else NO_DATA_MESSAGES['character'].get(language, 'No data')
    scripts = _format_script(scripts, language) if scripts else NO_DATA_MESSAGES['script'].get(language, 'No data')
    abbreviations = _format_abbreviation(abbreviations, language) if abbreviations else NO_DATA_MESSAGES['abbreviation'].get(language, 'No data')
    
    time_step6 = time.time() - timestamp_process

    # ============================================
    # 步骤 7: 构建 System Prompt
    # ============================================
    timestamp_build = time.time()
    
    # 根据语言选择对应的模板
    template_map = {
        'en': SYSTEM_ROLE_PROMPT_TEMPLATE_EN,
        'zh': SYSTEM_ROLE_PROMPT_TEMPLATE_ZH,
        'vi': SYSTEM_ROLE_PROMPT_TEMPLATE_VI
    }
    template = template_map.get(language, SYSTEM_ROLE_PROMPT_TEMPLATE_EN)  # 默认使用英文模板
    
    system_prompt = template.format(
        stage_prompt=stage_prompt,
        profile=profile,
        episodic_memories=episodic_memories,
        character_facets=character_facets,
        scripts=scripts,
        abbreviations=abbreviations
    )
    
    time_step7 = time.time() - timestamp_build
    
    # ============================================
    # 步骤 8: 添加最近对话
    # ============================================
    timestamp_messages = time.time()
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in recent_messages:
        messages.append({
            "role": msg['role'],
            "content": msg['content']
        })
    
    time_step8 = time.time() - timestamp_messages

    # ============================================
    # 步骤 9: 添加当前用户消息
    # ============================================
    messages.append({
        "role": "user",
        "content": current_query
    })
    
    # ============================================
    # 步骤 10: 日志记录
    # ============================================
    total_time = time.time() - timestamp_init
    
    # 记录性能数据
    logger.info(
        f"性能统计 | user_id={user_id} | "
        f"总耗时={total_time:.3f}s | "
        f"步骤1-2(用户信息+Embedding)={time_step1_2:.3f}s | "
        f"步骤3-5(并行I/O)={time_step3_5:.3f}s | "
        f"步骤6(处理结果)={time_step6:.3f}s | "
        f"步骤7(构建Prompt)={time_step7:.3f}s | "
        f"步骤8(添加历史)={time_step8:.3f}s | "
        f"messages数量={len(messages)}"
    )
    
    # 记录用户查询和完整Prompt
    logger.debug(
        f"构建上下文 | user_id={user_id} | "
        f"user_message={current_query} | "
        f"system_prompt={system_prompt}"
    )
    
    # ============================================
    # 步骤 11: 返回 Messages 数组
    # ============================================
    return messages


# ============================================
# 测试代码
# ============================================

if __name__ == "__main__":
    import asyncio
    
    async def test():
        # 初始化数据库连接池
        timestamp_init = time.time()
        await db_client.init_pool()
        print(f"⏱️  Database Pool Initialization: Time taken: {time.time() - timestamp_init} seconds")
        
        try:
            user_id = "24f8ed57-423c-4955-ac13-cb75de237b41"
            current_query = "你叫什么名字？你住哪儿？在哪上班？"
            
            print("\n" + "="*50)
            print("开始构建 Messages 数组")
            print("="*50 + "\n")
            
            timestamp = time.time()
            messages = await build_messages_for_chat(user_id, current_query)
            total_time = time.time() - timestamp
            print("\n" + "="*50)
            print(f"Messages: \n{messages}")
            print("="*50 + "\n")
            print(f"✅ 总耗时 (Total build_messages_for_chat): {total_time:.2f} 秒")
            print("="*50 + "\n")
            
        finally:
            # 关闭连接池
            await db_client.close_pool()
    
    # 运行测试
    asyncio.run(test())
