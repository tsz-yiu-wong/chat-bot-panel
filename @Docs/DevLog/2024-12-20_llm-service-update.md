# LLM服务更新日志

## 日期：2024-12-20

## 修改内容

### 1. 迁移到本地LLM服务器
- **目标**：将前端LLM调用从OpenAI API迁移到本地部署的服务器
- **服务器地址**：通过`LLM_SERVER_URL`环境变量配置（默认localhost:8000）
- **API端点**：`/api/v1/chat`

### 2. 移除前端模型选择权限
- **变更理由**：统一模型管理，由服务器端硬编码决定使用的模型
- **具体修改**：
  - 从`chat()`和`chatWithHistory()`方法中移除`model`参数
  - 请求体中不再传递`model`字段
  - 从`DEFAULT_LLM_SETTINGS`中移除`llmModel`配置项

### 3. 混合架构设计
- **聊天功能**：使用本地LLM服务器（更快、更私密）
- **Embedding功能**：继续使用OpenAI API（功能稳定、质量高）
- **认证机制**：
  - 本地服务器：`CHAT_BOT_API_KEY`
  - OpenAI：`OPENAI_API_KEY`

### 4. 技术细节

#### 聊天请求格式
```json
{
  "messages": [...],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

#### 环境变量配置
```bash
# 本地LLM服务器
LLM_SERVER_URL=http://45.140.221.14:8000  # 生产环境
# LLM_SERVER_URL=http://localhost:8000    # 开发环境
CHAT_BOT_API_KEY=your_api_key_here

# OpenAI (用于embedding)
OPENAI_API_KEY=your_openai_api_key_here
```

### 5. 影响范围
- ✅ 前端聊天功能迁移到本地服务器
- ✅ 保持现有API接口兼容性
- ✅ 向量化功能继续使用OpenAI（稳定可靠）
- ✅ 支持开发/生产环境灵活配置

### 6. 故障排查记录
**问题**：连接45.140.221.14:8000失败（ECONNREFUSED）
**原因**：服务器端LLM服务未启动
**解决方案**：
1. 添加环境变量支持，方便切换服务器
2. 保持embedding功能使用OpenAI确保稳定性

### 7. 待办事项
- [ ] 启动远程服务器的LLM服务
- [ ] 测试本地和远程服务器连接
- [ ] 验证混合架构工作正常
- [ ] 性能对比测试

## 架构优势
1. **性能优化**：聊天使用本地模型，响应更快
2. **功能稳定**：embedding使用OpenAI，质量保证
3. **成本控制**：减少OpenAI API调用次数
4. **灵活部署**：支持多环境配置

## 注意事项
1. 服务器端必须正确配置默认模型
2. 确保网络连接到指定IP地址
3. API密钥配置正确 