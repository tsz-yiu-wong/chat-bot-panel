# Test-Chat 页面优化功能规则

## 功能概述
优化 test-chat 页面的话题选择逻辑和数据访问方式，改进用户体验和系统性能。

## 设计思路

### 1. 数据访问优化
**问题**：原有实现通过内部 API 调用获取数据，在 Vercel serverless 环境下效率低下
**解决方案**：直接使用 supabase 客户端进行数据库操作

#### 优化原理
- **内部 API 调用**：需要额外的 HTTP 请求开销
- **直接数据库访问**：减少网络延迟，提高响应速度
- **适用场景**：简单的 CRUD 操作，不涉及复杂业务逻辑

#### 迁移策略
```typescript
// 原有方式
const response = await fetch('/api/chat/users');
const data = await response.json();

// 优化后
const { data: users, error } = await supabase
  .from('chat_users')
  .select('id, username, display_name')
  .eq('is_deleted', false);
```

### 2. 话题选择逻辑修正
**问题**：原有逻辑不符合数据库三级结构，随机选择不够均衡
**解决方案**：实现正确的三级随机选择流程

#### 数据库结构
```
topic_categories (大类)
├── id, name_cn, name_vn, sort_order
├── topic_subcategories (小类)
│   ├── id, category_id, name_cn, name_vn, sort_order
│   └── topics (具体话题)
│       └── id, category_id, subcategory_id, content, sort_order
```

#### 随机选择算法
```typescript
// 1. 从选中的大类中随机选择一个小类
const { data: subcategories } = await supabase
  .from('topic_subcategories')
  .select('id')
  .eq('category_id', selectedTopicCategory)
  .eq('is_deleted', false);

const randomSubcategory = subcategories[Math.floor(Math.random() * subcategories.length)];

// 2. 从选中的小类中随机选择一个话题
const { data: topics } = await supabase
  .from('topics')
  .select('content')
  .eq('subcategory_id', randomSubcategory.id)
  .eq('is_deleted', false);

const randomTopic = topics[Math.floor(Math.random() * topics.length)];
```

### 3. 双语显示格式统一
**设计目标**：提供清晰的双语标识，便于用户理解

#### 显示格式规则
- **格式**：`${name_vn}（${name_cn}）`
- **示例**：`Sở thích（兴趣爱好）`
- **适用范围**：所有具有双语字段的选项

#### 实现方式
```typescript
// 根据选项类型确定显示名称
let displayName = '';
if (option.name_vn && option.name_cn) {
  // 话题大类的格式："越南文（中文）"
  displayName = `${option.name_vn}（${option.name_cn}）`;
} else {
  // 其他选项的格式
  displayName = option.display_name || option.session_name || option.bot_name || option.name || '未命名';
}
```

## 实现细节

### 1. 数据加载函数重构
#### 用户管理
```typescript
const loadUsers = useCallback(async () => {
  try {
    const { data: users, error } = await supabase
      .from('chat_users')
      .select('id, username, display_name')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setUsers(users || []);
  } catch (error) {
    addLog(`加载用户失败: ${error}`, true);
    setUsers([]);
  }
}, [addLog]);
```

#### 话题大类加载
```typescript
const loadTopicCategories = useCallback(async () => {
  try {
    const { data: categories, error } = await supabase
      .from('topic_categories')
      .select('id, name_cn, name_vn, sort_order')
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true }); // 按排序字段排序
    
    if (error) throw error;
    setTopicCategories(categories || []);
  } catch (error) {
    addLog(`加载话题大类失败: ${error}`, true);
    setTopicCategories([]);
  }
}, [addLog]);
```

### 2. 话题发起逻辑
```typescript
const handleSendTopic = async () => {
  if (!selectedSession || !selectedTopicCategory) return;
  setIsProcessing(true);
  
  try {
    // 首先从选中的大类中随机选择一个小类
    const { data: subcategories, error: subcategoryError } = await supabase
      .from('topic_subcategories')
      .select('id')
      .eq('category_id', selectedTopicCategory)
      .eq('is_deleted', false);

    if (subcategoryError || !subcategories || subcategories.length === 0) {
      throw new Error('该话题大类下没有找到小类');
    }

    const randomSubcategory = subcategories[Math.floor(Math.random() * subcategories.length)];
    
    // 然后从选中的小类中随机选择一个话题
    const { data: topics, error: topicError } = await supabase
      .from('topics')
      .select('content')
      .eq('subcategory_id', randomSubcategory.id)
      .eq('is_deleted', false);

    if (topicError || !topics || topics.length === 0) {
      throw new Error('该话题小类下没有找到话题');
    }

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    // 将话题作为 'topic' 角色的消息插入
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: selectedSession,
        role: 'topic',
        content: randomTopic.content,
        is_processed: true, // 标记为已处理，不进入LLM流程
      })
      .select()
      .single();

    if (insertError) throw insertError;
    
    // 更新会话的最后消息时间
    await supabase
      .from('chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', selectedSession);

    addLog(`话题发送成功: ${randomTopic.content.substring(0, 30)}...`);
    loadMessages(selectedSession);
  } catch (error) {
    addLog(`发送话题失败: ${error}`, true);
  } finally {
    setIsProcessing(false);
  }
};
```

### 3. 自定义选择框组件优化
```typescript
const CustomSelectWithOptionDelete = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  onDelete, 
  disabled = false, 
  className = "",
  deleteTitle = "删除"
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  onDelete?: (id: string, name: string) => void;
  disabled?: boolean;
  className?: string;
  deleteTitle?: string;
}) => {
  // 根据选项类型确定显示名称
  let selectedName = '';
  if (selectedOption) {
    if (selectedOption.name_vn && selectedOption.name_cn) {
      // 话题大类的格式："越南文（中文）"
      selectedName = `${selectedOption.name_vn}（${selectedOption.name_cn}）`;
    } else {
      // 其他选项的格式
      selectedName = selectedOption.display_name || selectedOption.session_name || selectedOption.bot_name || selectedOption.name || '未命名';
    }
  }
  
  // ... 其他组件逻辑
};
```

## 兼容性考虑

### 1. 保持复杂操作的 API 调用
- **消息处理**：涉及 LLM 调用，保持 API 形式
- **向量操作**：涉及外部服务，保持 API 形式
- **用户认证**：涉及安全逻辑，保持 API 形式

### 2. 错误处理统一
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // 处理数据
} catch (error) {
  addLog(`操作失败: ${error}`, true);
  // 设置默认值或回滚状态
}
```

### 3. 状态管理优化
- **乐观更新**：对于简单操作，先更新 UI 再同步数据库
- **错误回滚**：操作失败时恢复之前的状态
- **加载状态**：提供清晰的加载和错误反馈

## 性能优化

### 1. 减少网络请求
- **直接数据库访问**：减少 HTTP 请求开销
- **批量操作**：合并多个相关操作

### 2. 数据缓存策略
- **本地状态缓存**：避免重复加载相同数据
- **智能刷新**：只在必要时重新加载数据

### 3. 排序优化
- **数据库排序**：利用数据库索引进行排序
- **前端排序**：对于小数据集，在前端进行排序

## 测试策略

### 1. 功能测试
- [ ] 话题大类加载和显示
- [ ] 双语格式显示正确
- [ ] 排序功能正常
- [ ] 话题发起的随机选择逻辑
- [ ] 用户和会话的创建删除功能

### 2. 性能测试
- [ ] 数据加载速度对比
- [ ] 内存使用情况
- [ ] 网络请求数量

### 3. 错误处理测试
- [ ] 网络错误处理
- [ ] 数据库错误处理
- [ ] 空数据处理

## 维护指南

### 1. 添加新的数据操作
1. 评估是否需要复杂业务逻辑
2. 简单操作直接使用 supabase 客户端
3. 复杂操作创建 API 端点

### 2. 修改显示格式
1. 确定字段类型和显示规则
2. 更新 `CustomSelectWithOptionDelete` 组件
3. 测试各种数据类型的显示效果

### 3. 扩展话题选择逻辑
1. 确保数据库结构支持新的选择方式
2. 更新随机选择算法
3. 测试新逻辑的随机性和正确性

## 注意事项

1. **数据库连接**：确保 supabase 客户端正确配置
2. **错误处理**：所有数据库操作都需要错误处理
3. **类型安全**：使用 TypeScript 确保类型安全
4. **用户体验**：提供清晰的加载和错误反馈
5. **性能考虑**：避免频繁的数据库查询 