"""
核心模型加载与推理模块
"""
from modelscope import AutoTokenizer, AutoModelForCausalLM
import torch
import re
from typing import List, Optional, Dict

def load_model():
    """
    从指定路径加载Qwen3-1.7B量化模型及对应的tokenizer。
    
    Returns:
        tuple: (tokenizer, model) 或 (None, None) 如果加载失败。
    """
    try:
        model_dir = './Qwen3-1.7B_quantized'
        
        print("INFO: 正在加载tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
        
        print("INFO: 正在加载模型...")
        model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True,
        )
        
        return tokenizer, model
    except Exception as e:
        print(f"ERROR: 模型加载失败: {e}")
        return None, None

def generate_chat_response(
    tokenizer, 
    model, 
    messages: List[Dict[str, str]], 
    max_tokens: int = 512,
    temperature: float = 0.7,
    top_p: float = 0.8,
    top_k: Optional[int] = 20,
    repetition_penalty: float = 1.1,
    do_sample: bool = True,
    **kwargs
) -> Optional[str]:
    """
    使用模型的聊天模板生成回复。

    此函数处理以下流程:
    1. 根据输入消息构建符合模型要求的prompt。
    2. 在控制台打印完整的prompt和模型原始输出，用于调试。
    3. 从模型原始输出中移除<think>...</think>思考过程标签。
    4. 返回清理后的、可直接展示给用户的回复。

    Args:
        tokenizer: 模型的分词器。
        model: 加载的语言模型。
        messages: OpenAI格式的消息列表。
        max_tokens: 最大生成token数。
        temperature: 采样温度。
        top_p: 核采样概率。
        top_k: Top-k采样。
        repetition_penalty: 重复惩罚系数。
        do_sample: 是否进行采样。

    Returns:
        清理后的字符串回复，或在失败时返回None。
    """
    try:
        # 使用 tokenizer 的 chat template 功能格式化输入
        formatted_prompt = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        print(f"DEBUG: 格式化后的 Prompt (发送至模型):\n---\n{formatted_prompt}\n---")
        
        inputs = tokenizer(formatted_prompt, return_tensors="pt").to(model.device)
        input_len = inputs['input_ids'].shape[1]
        
        # 配置生成参数
        generation_kwargs = {
            'max_new_tokens': max_tokens,
            'do_sample': do_sample,
            'temperature': temperature,
            'top_p': top_p,
            'pad_token_id': tokenizer.eos_token_id,
            'repetition_penalty': repetition_penalty,
        }
        
        if top_k is not None:
            generation_kwargs['top_k'] = top_k
            
        outputs = model.generate(
            **inputs, 
            **generation_kwargs
        )
        
        # 解码模型原始输出（包含新生成的部分）
        raw_response = tokenizer.decode(outputs[0][input_len:], skip_special_tokens=True)
        print(f"DEBUG: 模型的原始输出 (可能包含<think>标签):\n---\n{raw_response}\n---")

        # 使用正则表达式移除<think>...</think>标签及其内容
        cleaned_response = re.sub(r'<think>.*?</think>\s*', '', raw_response, flags=re.DOTALL).strip()
        
        return cleaned_response
        
    except Exception as e:
        print(f"ERROR: 生成回复时出错: {e}")
        return None 