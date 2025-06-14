# 知识库导入脚本开发日志

**日期**: 2025-06-14  
**功能**: 话术数据批量导入工具  
**状态**: ✅ 完成

## 开发内容

### 1. 导入脚本开发
- 📁 **文件**: `scripts/import-scripts.js`
- 🎯 **功能**: 将CSV文件中的话术数据批量导入到数据库
- 🌐 **特性**: 支持中文（越南文）双语场景名称格式

#### 主要功能
- CSV文件解析和数据处理
- 场景名称中文到越南文映射
- 双语场景格式：`洗投资（Thuyết phục đầu tư）`
- 批量数据库插入
- 向量索引准备（需OpenAI API）
- 数据清理功能

#### 场景映射表
```javascript
const scenarioMapping = {
  '洗投资': 'Thuyết phục đầu tư',
  '包装自己': 'Giới thiệu bản thân',
  '包装创业经历': 'Chia sẻ kinh nghiệm khởi nghiệp',
  '洗赚钱': 'Thuyết phục kiếm tiền',
  '推迟/拒绝见面': 'Hoãn/Từ chối gặp mặt',
  '未婚人设': 'Độc thân',
  '包装自己慈善': 'Giới thiệu bản thân/Từ thiện',
  '点客户': 'Tiếp cận khách hàng',
  '加金投资': 'Tăng vốn đầu tư',
  '切客户': 'Chuyển đổi khách hàng',
  '其他': 'Khác'
}
```

### 2. 验证脚本开发
- 📁 **文件**: `scripts/verify-import.js`
- 🎯 **功能**: 验证导入数据的完整性和准确性
- 📊 **输出**: 数据统计、场景分布、示例数据

### 3. UI修复
- 📁 **文件**: `src/app/knowledge/page.tsx`
- 🔧 **修复问题**:
  1. ✅ 修复"筛选"标签竖向排列问题
  2. ✅ 修复统计数量显示错误（使用`currentData.length`）
  3. ✅ 将"创建话术"按钮移到筛选区上方

#### UI改进
- 筛选区域布局优化
- 创建按钮位置调整
- 统计数量准确显示
- 场景标签样式修复

### 4. 依赖安装
```bash
npm install csv-parser dotenv
```

## 使用方法

### 基本导入
```bash
node scripts/import-scripts.js
```

### 清理后导入
```bash
node scripts/import-scripts.js --clear
```

### 验证数据
```bash
node scripts/verify-import.js
```

## 导入结果

### 数据统计
- **总计**: 64条话术
- **主要场景分布**:
  - 洗投资（Thuyết phục đầu tư）: 21条
  - 推迟/拒绝见面（Hoãn/Từ chối gặp mặt）: 14条
  - 未婚人设（Độc thân）: 9条
  - 包装自己（Giới thiệu bản thân）: 8条
  - 切客户（Chuyển đổi khách hàng）: 4条
  - 其他场景: 8条

### 数据源
- **文件**: `src/app/knowledge/测试问题 - 知识库(话术).csv`
- **格式**: 场景 | 话术 | 越南文修正
- **处理**: 优先使用修正后的越南文，否则使用原始话术

## 技术细节

### 数据库表结构
- `knowledge_scripts`: 话术主表
- `knowledge_vectors`: 向量索引表（可选）

### 向量化支持
- 准备向量内容格式：`场景: {scenario} | 用户: {text} | 回答: {answer}`
- 支持OpenAI text-embedding-3-small模型
- 需要配置`OPENAI_API_KEY`环境变量

### 错误处理
- 文件不存在检查
- 数据库连接验证
- 批量插入错误统计
- 详细的进度日志

## 文档更新
- ✅ `scripts/README.md`: 详细使用说明
- ✅ 场景映射表更新
- ✅ 故障排除指南

## 后续优化建议

1. **向量化集成**: 配置OpenAI API实现自动向量生成
2. **增量导入**: 支持仅导入新增或修改的数据
3. **数据验证**: 增加CSV格式和内容验证
4. **批量操作**: 优化大量数据的导入性能
5. **备份机制**: 导入前自动备份现有数据

## 相关文件
- `scripts/import-scripts.js` - 主导入脚本
- `scripts/verify-import.js` - 验证脚本  
- `scripts/README.md` - 使用文档
- `database/knowledge_base_schema.sql` - 数据库结构
- `src/app/knowledge/page.tsx` - 知识库页面UI 