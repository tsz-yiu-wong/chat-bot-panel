"""
Server 后端服务

包含：

# index.py: FastAPI 应用入口
- 定义路由：POST /chat/send
- 配置 CORS、中间件
- 实现完整的聊天处理流程
- 管理异步记忆分析任务
- 管理数据库连接池生命周期

# config.py: 配置管理模块
- 从环境变量读取配置
- 定义系统常量和阈值
- 管理 Supabase、OpenAI 连接信息

# utils.py: 工具函数模块
- 消息格式化
- 参数验证
- 任务重试控制
- 消息保护机制
"""

