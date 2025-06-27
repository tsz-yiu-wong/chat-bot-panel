import os
import requests
import time
import dotenv
import json

# 加载 .env 文件中的环境变量
dotenv.load_dotenv()

# --- 配置 ---
# 在这里自定义你的 System Role Prompt
SYSTEM_PROMPT = "你是一个亲切、温柔、可爱的女生，回答问题时，不要过多解释和废话。"

# API 服务器地址和认证
API_URL = "http://127.0.0.1:8000/api/v1/chat"
API_KEY = os.environ.get("CHAT_BOT_API_KEY")

# 输入/输出文件
INPUT_PATH = "./test.txt"
OUTPUT_PATH = "./test_result.txt"


def call_chat_api(messages: list) -> str:
    """
    调用聊天API并返回助手的回复。
    会自动去除<think>标签。
    """
    headers = {
        "Content-Type": "application/json",
    }
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    payload = {
        "model": "Qwen3-1.7B_quantized",
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()  # 如果状态码不是 2xx，则抛出异常
        data = response.json()
        
        answer = data['choices'][0]['message']['content']
        
        # 移除 <think> 标签
        if "</think>" in answer:
            answer = answer.split("</think>", 1)[-1].strip()
            
        return answer
        
    except requests.exceptions.RequestException as e:
        return f"[ERROR] API 请求失败: {e}"
    except (KeyError, IndexError):
        return f"[ERROR] API 响应格式无效: {response.text}"
    except Exception as e:
        return f"[ERROR] 发生未知错误: {e}"


def main():
    """主函数，执行测试流程。"""
    # 检查 test.txt 是否存在
    if not os.path.exists(INPUT_PATH):
        print(f"错误: 输入文件 '{INPUT_PATH}' 不存在。")
        # 创建一个示例文件
        with open(INPUT_PATH, "w", encoding="utf-8") as f:
            f.write("你好，请介绍一下你自己。\n")
            f.write("中国的首都是哪里？\n")
            f.write("那里的天气怎么样？\n")
        print(f"已创建示例文件 '{INPUT_PATH}'。请根据需要修改后重新运行。")
        return

    with open(INPUT_PATH, "r", encoding="utf-8") as fin:
        questions = [line.strip() for line in fin if line.strip()]

    if len(questions) < 3:
        print(f"错误: '{INPUT_PATH}' 需要至少3行内容来进行测试。")
        return

    with open(OUTPUT_PATH, "w", encoding="utf-8") as fout:
        print("--- 正在执行测试 ---")
        
        # --- 测试1: 单独问答 ---
        print("正在执行: 单独问答测试...")
        q1 = questions[0]
        messages_test1 = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": q1}
        ]
        a1 = call_chat_api(messages_test1)
        fout.write("--- 单独问答测试 ---\n")
        fout.write(f"Q1: {q1}\nA1: {a1}\n\n")
        fout.flush()
        print("完成。")
        time.sleep(0.5)

        # --- 测试2: 连续问答 ---
        print("正在执行: 连续问答测试...")
        conversation_history = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # 第二个问题
        q2 = questions[1]
        print(f"  - 问题 2: {q2}")
        conversation_history.append({"role": "user", "content": q2})
        a2 = call_chat_api(conversation_history)
        conversation_history.append({"role": "assistant", "content": a2}) # 将回复加入历史
        
        # 第三个问题 (连续对话)
        q3 = questions[2]
        print(f"  - 问题 3: {q3}")
        conversation_history.append({"role": "user", "content": q3})
        a3 = call_chat_api(conversation_history)
        
        fout.write("--- 连续问答测试 ---\n")
        fout.write(f"Q2: {q2}\nA2: {a2}\n\n")
        fout.write(f"Q3: {q3}\nA3: {a3}\n\n")
        fout.flush()
        print("完成。")
        
        print(f"--- 所有测试完成，结果已写入 '{OUTPUT_PATH}' ---")


if __name__ == "__main__":
    main()
