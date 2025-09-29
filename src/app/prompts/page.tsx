import { createServerActionClient } from '@/lib/supabase-server';
import { PromptsList } from './prompts-list';

// 定义数据类型
export interface PromptStage {
  id: string;
  name: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: string;
  name: string;
  stage_id: string | null;
  language: 'en' | 'zh' | 'vi';
  prompt: string | null;
  mark: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // 关联的 Stage 信息
  stage?: PromptStage | null;
}

// 获取 Prompt Stages 数据
async function getPromptStages(): Promise<PromptStage[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('prompt_stages')
      .select('*')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('获取 Prompt Stages 失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Stages):', error);
    return [];
  }
}

// 获取 Prompts 数据
async function getPrompts(): Promise<Prompt[]> {
  try {
    const supabase = await createServerActionClient();
    
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取 Prompts 失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('数据库连接异常 (Prompts):', error);
    return [];
  }
}

export default async function PromptsPage() {
  try {
    // 并行获取数据以提高性能
    const dataPromise = Promise.all([
      getPromptStages(),
      getPrompts()
    ]);

    // 设置 10 秒超时，防止页面长时间卡顿
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('数据加载超时')), 10000);
    });

    const [allStages, promptsWithoutStage] = await Promise.race([dataPromise, timeoutPromise]);

    // 在服务端进行数据关联
    const stagesMap = new Map(allStages.map(stage => [stage.id, stage]));
    const promptsWithStage = promptsWithoutStage.map(prompt => ({
      ...prompt,
      stage: prompt.stage_id ? stagesMap.get(prompt.stage_id) || null : null
    }));

    return (
      <div className="flex flex-col h-full">
        <PromptsList 
          initialStages={allStages}
          initialPrompts={promptsWithStage}
        />
      </div>
    );
  } catch (error) {
    console.error('Prompts 页面加载失败:', error);
    
    // 在超时或错误时，返回带有空数据的页面，避免崩溃
    return (
      <div className="flex flex-col h-full">
        <PromptsList 
          initialStages={[]}
          initialPrompts={[]}
        />
      </div>
    );
  }
}