#!/usr/bin/env python3
"""
FastAPI 聊天接口测试脚本
测试 POST /api/messages 端点的各种场景

cd /Users/tywong/Documents/Project/chat-bot-panel/server
uvicorn index:app --reload --port 8000

cd /Users/tywong/Documents/Project/chat-bot-panel/server
python test_chat.py

python test_chat.py quick
"""

import requests
import json
import time
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed


# ============================================
# 配置
# ============================================

BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{BASE_URL}/api/messages"

# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


# ============================================
# 工具函数
# ============================================

def print_test_header(test_name: str):
    """打印测试标题"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"测试: {test_name}")
    print(f"{'='*60}{Colors.RESET}")


def print_success(message: str):
    """打印成功信息"""
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")


def print_error(message: str):
    """打印错误信息"""
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")


def print_warning(message: str):
    """打印警告信息"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")


def send_message(platform: str, username: str, language: str, message: str, model: str = None) -> Dict[str, Any]:
    """
    发送聊天消息
    
    返回格式: {
        "success": bool,
        "status_code": int,
        "data": dict or None,
        "error": str or None,
        "response_time": float
    }
    """
    payload = {
        "platform": platform,
        "username": username,
        "language": language,
        "message": message
    }
    if model:
        payload["model"] = model
    
    start_time = time.time()
    
    try:
        response = requests.post(API_ENDPOINT, json=payload, timeout=30)
        response_time = time.time() - start_time
        
        return {
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "data": response.json() if response.status_code == 200 else None,
            "error": response.text if response.status_code != 200 else None,
            "response_time": response_time
        }
    except requests.exceptions.RequestException as e:
        response_time = time.time() - start_time
        return {
            "success": False,
            "status_code": 0,
            "data": None,
            "error": str(e),
            "response_time": response_time
        }


def print_response(result: Dict[str, Any], show_full_response: bool = True):
    """打印响应信息"""
    if result["success"]:
        print_success(f"状态码: {result['status_code']}")
        print(f"响应时间: {result['response_time']:.2f}秒")
        if show_full_response and result["data"]:
            print(f"AI 回复: {result['data'].get('reply', 'N/A')}")
    else:
        print_error(f"请求失败 - 状态码: {result['status_code']}")
        print(f"错误信息: {result['error']}")


# ============================================
# 测试用例
# ============================================

def test_01_basic_chat():
    """测试1: 基本聊天功能"""
    print_test_header("基本聊天功能")
    
    result = send_message(
        platform="wechat",
        username="test_user_01",
        language="zh",
        message="你好，我是新用户"
    )
    
    print_response(result)
    
    if result["success"]:
        assert "reply" in result["data"], "响应中缺少 reply 字段"
        print_success("基本聊天功能正常")
    else:
        print_error("基本聊天功能失败")
    
    return result["success"]


def test_02_multi_turn_conversation():
    """测试2: 多轮对话（测试上下文记忆）"""
    print_test_header("多轮对话（上下文记忆）")
    
    username = "test_user_02"
    conversations = [
        "我叫张三",
        "我今年25岁",
        "我喜欢打篮球",
        "你还记得我叫什么名字吗？",
        "我多大了？",
        "我的爱好是什么？"
    ]
    
    success_count = 0
    for i, message in enumerate(conversations, 1):
        print(f"\n[第 {i} 轮] 用户: {message}")
        result = send_message("wechat", username, message)
        
        if result["success"]:
            print(f"[第 {i} 轮] AI: {result['data']['reply']}")
            success_count += 1
        else:
            print_error(f"第 {i} 轮对话失败")
        
        time.sleep(1)  # 避免请求过快
    
    success_rate = success_count / len(conversations)
    if success_rate == 1.0:
        print_success(f"多轮对话测试完成 ({success_count}/{len(conversations)})")
    else:
        print_warning(f"多轮对话部分成功 ({success_count}/{len(conversations)})")
    
    return success_rate > 0.5


def test_03_different_platforms():
    """测试3: 不同平台用户"""
    print_test_header("不同平台用户")
    
    platforms = [
        ("wechat", "wechat_user_001", "我是微信用户"),
        ("telegram", "telegram_user_001", "我是 Telegram 用户"),
        ("line", "line_user_001", "我是 LINE 用户"),
        ("custom_app", "custom_user_001", "我是自定义应用用户")
    ]
    
    success_count = 0
    for platform, username, message in platforms:
        print(f"\n测试平台: {platform}")
        result = send_message(platform, username, message)
        
        if result["success"]:
            print_success(f"{platform} 平台测试通过")
            success_count += 1
        else:
            print_error(f"{platform} 平台测试失败")
        
        time.sleep(0.5)
    
    success_rate = success_count / len(platforms)
    print(f"\n平台测试通过率: {success_rate*100:.0f}% ({success_count}/{len(platforms)})")
    
    return success_rate > 0.5


def test_04_edge_cases():
    """测试4: 边界情况"""
    print_test_header("边界情况测试")
    
    test_cases = [
        ("空消息", "wechat", "test_edge_01", ""),
        ("单个字符", "wechat", "test_edge_02", "a"),
        ("超长消息", "wechat", "test_edge_03", "这是一条很长的消息。" * 100),
        ("特殊字符", "wechat", "test_edge_04", "!@#$%^&*()_+{}[]|\\:;<>?,./~`"),
        ("中英混合", "wechat", "test_edge_05", "Hello 你好 こんにちは 안녕하세요 Привет"),
        ("表情符号", "wechat", "test_edge_06", "😀😃😄😁🎉🎊🎈🎁💯🔥"),
        ("换行符", "wechat", "test_edge_07", "第一行\n第二行\n第三行"),
        ("HTML标签", "wechat", "test_edge_08", "<script>alert('test')</script>"),
        ("SQL注入尝试", "wechat", "test_edge_09", "'; DROP TABLE users; --"),
    ]
    
    passed = 0
    for test_name, platform, username, message in test_cases:
        print(f"\n测试: {test_name}")
        print(f"消息长度: {len(message)} 字符")
        
        result = send_message(platform, username, message)
        
        if result["success"]:
            print_success(f"{test_name} - 通过")
            passed += 1
        else:
            print_error(f"{test_name} - 失败 (状态码: {result['status_code']})")
        
        time.sleep(0.5)
    
    success_rate = passed / len(test_cases)
    print(f"\n边界测试通过率: {success_rate*100:.0f}% ({passed}/{len(test_cases)})")
    
    return success_rate > 0.5


def test_05_missing_parameters():
    """测试5: 缺少必填参数"""
    print_test_header("参数验证测试")
    
    test_cases = [
        ("缺少 platform", {"username": "test", "message": "hello"}),
        ("缺少 username", {"platform": "wechat", "message": "hello"}),
        ("缺少 message", {"platform": "wechat", "username": "test"}),
        ("所有参数缺失", {}),
        ("错误的数据类型", {"platform": 123, "username": "test", "message": "hello"}),
    ]
    
    passed = 0
    for test_name, payload in test_cases:
        print(f"\n测试: {test_name}")
        
        try:
            response = requests.post(API_ENDPOINT, json=payload, timeout=10)
            
            # 预期这些请求应该返回 422 (验证错误) 或 400 (错误请求)
            if response.status_code in [400, 422]:
                print_success(f"{test_name} - 正确拒绝 (状态码: {response.status_code})")
                passed += 1
            else:
                print_warning(f"{test_name} - 意外接受 (状态码: {response.status_code})")
        except Exception as e:
            print_error(f"{test_name} - 异常: {str(e)}")
        
        time.sleep(0.3)
    
    success_rate = passed / len(test_cases)
    print(f"\n参数验证测试通过率: {success_rate*100:.0f}% ({passed}/{len(test_cases)})")
    
    return success_rate > 0.5


def test_06_different_models():
    """测试6: 不同 LLM 模型"""
    print_test_header("不同 LLM 模型测试")
    
    models = [
        "gpt-4o-mini",
        "gpt-4o",
        "gpt-3.5-turbo",
    ]
    
    success_count = 0
    for model in models:
        print(f"\n测试模型: {model}")
        result = send_message(
            platform="wechat",
            username="test_model_user",
            message="请用一句话介绍你自己",
            model=model
        )
        
        if result["success"]:
            print_success(f"{model} 模型测试通过")
            print(f"响应时间: {result['response_time']:.2f}秒")
            success_count += 1
        else:
            print_error(f"{model} 模型测试失败")
        
        time.sleep(1)
    
    success_rate = success_count / len(models)
    print(f"\n模型测试通过率: {success_rate*100:.0f}% ({success_count}/{len(models)})")
    
    return success_rate > 0.5


def test_07_concurrent_requests():
    """测试7: 并发请求"""
    print_test_header("并发请求测试")
    
    num_requests = 10
    print(f"同时发送 {num_requests} 个请求...")
    
    def send_concurrent_message(index: int):
        return send_message(
            platform="wechat",
            username=f"concurrent_user_{index}",
            message=f"这是并发测试消息 #{index}"
        )
    
    start_time = time.time()
    success_count = 0
    
    with ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(send_concurrent_message, i) for i in range(num_requests)]
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result["success"]:
                success_count += 1
                print(f"请求 {i}/{num_requests} 完成 ✓")
            else:
                print(f"请求 {i}/{num_requests} 失败 ✗")
    
    total_time = time.time() - start_time
    success_rate = success_count / num_requests
    
    print(f"\n并发测试结果:")
    print(f"  总请求数: {num_requests}")
    print(f"  成功数: {success_count}")
    print(f"  失败数: {num_requests - success_count}")
    print(f"  成功率: {success_rate*100:.0f}%")
    print(f"  总耗时: {total_time:.2f}秒")
    print(f"  平均响应时间: {total_time/num_requests:.2f}秒")
    
    if success_rate >= 0.8:
        print_success("并发测试通过")
    else:
        print_warning("并发测试部分成功")
    
    return success_rate >= 0.5


def test_08_rapid_messages_same_user():
    """测试8: 同一用户快速连续消息"""
    print_test_header("同一用户快速连续消息")
    
    username = "rapid_test_user"
    messages = [
        "你好",
        "我叫李四",
        "今天天气怎么样？",
        "给我讲个笑话",
        "谢谢你"
    ]
    
    print(f"用户 {username} 快速发送 {len(messages)} 条消息...")
    
    success_count = 0
    start_time = time.time()
    
    for i, message in enumerate(messages, 1):
        result = send_message("wechat", username, message)
        if result["success"]:
            success_count += 1
            print(f"消息 {i}/{len(messages)} 发送成功")
        else:
            print_error(f"消息 {i}/{len(messages)} 发送失败")
        
        time.sleep(0.2)  # 快速连续发送
    
    total_time = time.time() - start_time
    success_rate = success_count / len(messages)
    
    print(f"\n快速消息测试结果:")
    print(f"  成功率: {success_rate*100:.0f}%")
    print(f"  总耗时: {total_time:.2f}秒")
    
    return success_rate > 0.8


def test_09_server_health():
    """测试9: 服务器健康检查"""
    print_test_header("服务器健康检查")
    
    try:
        # 测试服务器是否可访问
        response = requests.get(BASE_URL, timeout=5)
        print_success(f"服务器可访问 (状态码: {response.status_code})")
        
        # 测试 API 文档
        docs_url = f"{BASE_URL}/docs"
        response = requests.get(docs_url, timeout=5)
        if response.status_code == 200:
            print_success(f"API 文档可访问: {docs_url}")
        else:
            print_warning(f"API 文档不可访问: {docs_url}")
        
        return True
    except Exception as e:
        print_error(f"服务器健康检查失败: {str(e)}")
        return False


def test_10_memory_trigger():
    """测试10: 触发记忆分析机制"""
    print_test_header("记忆分析触发机制")
    
    username = "memory_test_user"
    num_messages = 25  # 超过阈值以触发记忆分析
    
    print(f"发送 {num_messages} 条消息以触发记忆分析...")
    print("注意: 记忆分析是异步的，不会阻塞响应")
    
    success_count = 0
    for i in range(1, num_messages + 1):
        message = f"这是第 {i} 条测试消息，用于触发记忆分析机制"
        result = send_message("wechat", username, message)
        
        if result["success"]:
            success_count += 1
            if i % 5 == 0:
                print(f"已发送 {i}/{num_messages} 条消息")
        
        time.sleep(0.3)
    
    success_rate = success_count / num_messages
    print(f"\n记忆触发测试结果:")
    print(f"  成功发送: {success_count}/{num_messages}")
    print(f"  成功率: {success_rate*100:.0f}%")
    print_warning("请检查服务器日志确认记忆分析是否被触发")
    
    return success_rate > 0.8


# ============================================
# 主测试运行器
# ============================================

def run_all_tests():
    """运行所有测试"""
    print(f"{Colors.BLUE}")
    print("="*60)
    print("  FastAPI 聊天接口测试套件")
    print("="*60)
    print(f"{Colors.RESET}")
    print(f"测试目标: {API_ENDPOINT}")
    print(f"开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 首先检查服务器健康状态
    if not test_09_server_health():
        print_error("\n服务器不可访问，终止测试")
        print_warning("请确保服务器已启动: uvicorn index:app --reload")
        return
    
    # 定义所有测试
    tests = [
        ("基本聊天功能", test_01_basic_chat),
        ("多轮对话", test_02_multi_turn_conversation),
        ("不同平台", test_03_different_platforms),
        ("边界情况", test_04_edge_cases),
        ("参数验证", test_05_missing_parameters),
        ("不同模型", test_06_different_models),
        ("并发请求", test_07_concurrent_requests),
        ("快速连续消息", test_08_rapid_messages_same_user),
        ("记忆触发", test_10_memory_trigger),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print_error(f"测试异常: {str(e)}")
            results[test_name] = False
        
        time.sleep(1)  # 测试之间的间隔
    
    # 汇总报告
    print(f"\n{Colors.BLUE}{'='*60}")
    print("  测试汇总报告")
    print(f"{'='*60}{Colors.RESET}\n")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✅ 通过{Colors.RESET}" if result else f"{Colors.RED}❌ 失败{Colors.RESET}"
        print(f"{test_name:20} {status}")
    
    print(f"\n总体通过率: {passed}/{total} ({passed/total*100:.0f}%)")
    
    if passed == total:
        print_success("所有测试通过！🎉")
    elif passed >= total * 0.8:
        print_warning("大部分测试通过")
    else:
        print_error("多个测试失败，请检查")
    
    print(f"\n结束时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")


# ============================================
# 快速单独测试
# ============================================

def quick_test():
    """快速测试 - 只测试基本功能"""
    print_test_header("快速测试")
    
    result = send_message(
        platform="wechat",
        username="quick_test_user",
        language="zh",
        message="我就是湖南人啊！你简直太聪明了！可靠、聪明，简直就是我的择偶标准！"
    )
    
    print_response(result)


# ============================================
# 主入口
# ============================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        # 快速测试模式
        quick_test()
    else:
        # 完整测试模式
        run_all_tests()

