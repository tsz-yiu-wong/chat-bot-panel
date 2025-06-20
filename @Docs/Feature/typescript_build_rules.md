# TypeScript 构建规范 - 避免构建错误的最佳实践

## 概述
本文档总结了在 Next.js + TypeScript 项目中常见的构建错误及其解决方案，帮助开发者避免类似问题。

## 1. 类型定义规范

### 1.1 禁止使用 any 类型
❌ **错误示例**
```typescript
const searchResponse = { results: [] as any[] };
const updateData: { [key: string]: any } = {};
```

✅ **正确示例**
```typescript
// 创建具体的类型定义
interface KnowledgeSearchResult {
  id: string | number;
  title: string;
  content: string;
  type: 'script' | 'abbreviation' | 'knowledge' | undefined;
  similarity: number;
}

const searchResponse: KnowledgeSearchResponse = { results: [] };
const updateData: Record<string, string | number | boolean> = {};
```

### 1.2 函数参数类型化
❌ **错误示例**
```typescript
const loadData = useCallback(async (endpoint: string, setter: Function, name: string) => {
  // ...
});
```

✅ **正确示例**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadData = useCallback(async (endpoint: string, setter: (data: any[]) => void, name: string) => {
  // 在必要时使用 ESLint 禁用注释，但要明确说明原因
});
```

## 2. Next.js 15 路由规范

### 2.1 动态路由参数类型
❌ **错误示例（Next.js 14 及以下）**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
}
```

✅ **正确示例（Next.js 15+）**
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
}
```

## 3. 未使用变量处理

### 3.1 必需的未使用参数
当接口要求某些参数但我们不使用时，使用下划线前缀和 ESLint 禁用注释：

✅ **正确示例**
```typescript
function createSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        get: (_name: string) => undefined,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set: (_name: string, _value: string, _options: CookieOptions) => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove: (_name: string, _options: CookieOptions) => {}
      },
    }
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // 当 request 参数被 Next.js 要求但未使用时
}
```

### 3.2 清理未使用的导入
定期检查并移除未使用的导入：

❌ **错误示例**
```typescript
import { Send, Users, Settings, AlertTriangle } from 'lucide-react';
// Settings 未使用
```

✅ **正确示例**
```typescript
import { Send, Users, AlertTriangle } from 'lucide-react';
// 只导入实际使用的组件
```

## 4. 类型安全的数据处理

### 4.1 API 响应类型化
创建专门的类型文件来管理复杂的数据结构：

```typescript
// src/lib/types/knowledge.ts
export interface KnowledgeSearchResult {
  id: string | number;
  title: string;
  content: string;
  type: 'script' | 'abbreviation' | 'knowledge' | undefined;
  similarity: number;
}

export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}
```

### 4.2 函数返回类型匹配
确保函数返回的数据结构与声明的类型完全匹配：

❌ **错误示例**
```typescript
// 函数返回 { type: string | undefined } 但期望 { type: 'script' | 'abbreviation' | 'knowledge' | undefined }
let content, title, type;
if (vector.document_type === 'script') {
  type = 'script'; // 这里 type 被推断为 string
}
```

✅ **正确示例**
```typescript
// 明确声明变量类型
let content, title, type: 'script' | 'abbreviation' | 'knowledge' | undefined;
if (vector.document_type === 'script') {
  type = 'script'; // 现在类型匹配
}
```

## 5. 构建检查流程

### 5.1 构建前检查清单
1. 运行 `npm run build` 检查 TypeScript 错误
2. 检查 ESLint 警告和错误
3. 确保所有类型定义完整
4. 验证动态路由参数类型（Next.js 15+）

### 5.2 常用调试命令
```bash
# 完整构建检查
npm run build

# 仅类型检查
npx tsc --noEmit

# ESLint 检查
npx eslint . --ext .ts,.tsx
```

## 6. 最佳实践总结

1. **优先使用具体类型**：避免 `any`，创建明确的接口定义
2. **处理必需的未使用参数**：使用下划线前缀 + ESLint 禁用注释
3. **保持类型一致性**：确保函数返回值与声明类型匹配
4. **及时清理代码**：移除未使用的导入和变量
5. **升级适配**：注意 Next.js 版本升级带来的类型变化
6. **分离类型定义**：将复杂类型抽离到独立文件中管理

## 7. 错误处理模式

```typescript
// 推荐的错误处理模式
try {
  const result = await someAsyncOperation();
  // 处理成功情况
} catch (error) {
  console.error('Operation failed:', error);
  // 具体的错误处理逻辑
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

遵循以上规范可以显著减少 TypeScript 构建错误，提高代码质量和开发效率。 