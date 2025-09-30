'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Filter, ChevronDown, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';

import { PromptStage, Prompt } from './page';
import { filterPrompts } from './utils';
import { deletePrompt } from './actions';
import { ManageStagesDialog } from './manage-stages-dialog';
import { AddPromptDialog } from './add-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';
import { ConfirmDeleteDialog } from '../knowledge/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';

interface PromptsListProps {
  initialStages: PromptStage[];
  initialPrompts: Prompt[];
}

export function PromptsList({ initialStages, initialPrompts }: PromptsListProps) {
  // 使用hydration-safe翻译，避免hydration不匹配
  const { t } = useHydrationSafeTranslation();
  
  // 获取用户权限
  const { userRole } = useUser();
  const { addToast } = useToast();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;

  // 状态管理
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageDropdownOpen, setStageDropdownOpen] = useState<boolean>(false);
  const [manageStagesOpen, setManageStagesOpen] = useState<boolean>(false);
  const [addPromptOpen, setAddPromptOpen] = useState<boolean>(false);
  const [editPromptOpen, setEditPromptOpen] = useState<boolean>(false);
  const [deletePromptOpen, setDeletePromptOpen] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // 筛选后的 Prompt 项目
  const filteredPrompts = useMemo(() => {
    return filterPrompts(initialPrompts, selectedStage, searchQuery);
  }, [initialPrompts, selectedStage, searchQuery]);

  // 获取选中 Stage 的显示名称
  const getSelectedStageName = () => {
    if (selectedStage === 'all') return t('common.all');
    const stage = initialStages.find(s => s.id === selectedStage);
    return stage?.name || t('common.all');
  };

  // 处理编辑
  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setEditPromptOpen(true);
  };

  // 处理删除
  const handleDelete = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setDeletePromptOpen(true);
  };

  // 获取删除确认文本
  const getDeleteText = () => {
    if (!selectedPrompt) return '';
    return t('common.actions.delete_confirm', { 
      type: t('prompts.module_name'), 
      name: selectedPrompt.name 
    });
  };

  // 执行删除
  const executeDelete = async () => {
    if (!selectedPrompt) return;

    const result = await deletePrompt(selectedPrompt.id);

    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeletePromptOpen(false);
      setSelectedPrompt(null);
    } else {
      addToast('error', result.error || t('common.messages.delete_failed'));
    }
  };

  // 切换展开/收起
  const toggleExpand = (promptId: string) => {
    setExpandedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(promptId)) {
        newSet.delete(promptId);
      } else {
        newSet.add(promptId);
      }
      return newSet;
    });
  };

  // Prompt 内容组件（带展开/收起功能）
  const PromptContent = ({ prompt }: { prompt: Prompt }) => {
    // 配置：最多完整显示的行数（如果超过此行数，会折叠显示）
    const MAX_DISPLAY_LINES = 5;
    
    const contentRef = useRef<HTMLDivElement>(null);
    const [needsExpand, setNeedsExpand] = useState(false);
    const isExpanded = expandedPrompts.has(prompt.id);

    useEffect(() => {
      if (contentRef.current && prompt.prompt) {
        // 1. 获取准确的 computed style
        const style = window.getComputedStyle(contentRef.current);
        const lineHeight = parseFloat(style.lineHeight); // e.g., 21px
        const paddingTop = parseFloat(style.paddingTop); // e.g., 12px
        const paddingBottom = parseFloat(style.paddingBottom); // e.g., 12px

        // 2. 从 scrollHeight 中减去 padding，得到纯内容高度
        const pureContentHeight = contentRef.current.scrollHeight - paddingTop - paddingBottom;
        
        // 3. 计算行数，并使用 Math.round 避免浮点数误差
        const lines = Math.round(pureContentHeight / lineHeight);
        
        // 4. 正确判断是否需要折叠
        setNeedsExpand(lines > MAX_DISPLAY_LINES);
      }
    }, [prompt.prompt]); // 仅在 prompt 内容变化时重新计算

    return (
      <div className="relative">
        <div className="bg-muted border-l-4 border-primary rounded-xl">
          <div 
            ref={contentRef}
            className="p-3 text-sm whitespace-pre-wrap overflow-hidden"
            style={!isExpanded && needsExpand ? { 
              // 折叠时只显示 (MAX_DISPLAY_LINES - 1) 行，为省略号留出空间
              maxHeight: `calc(1.5em * ${MAX_DISPLAY_LINES})` 
            } : undefined}
          >
            {prompt.prompt || t('common.placeholders.no_content', { field: t('prompts.fields.prompt') })}
          </div>
          {!isExpanded && needsExpand && (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              ...
            </div>
          )}
        </div>
        
        {needsExpand && (
          <div className="flex justify-center -mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleExpand(prompt.id)}
              className="rounded-full px-3 py-0.5 h-6 shadow-sm hover:shadow-md transition-all bg-background"
            >
              <span className="text-xs">
                {isExpanded ? t('common.actions.collapse') : t('common.actions.expand')}
              </span>
              <ChevronDown className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} />
            </Button>
          </div>
        )}

        {prompt.mark && (
          <div className={`text-xs text-muted-foreground ${
            needsExpand ? 'mt-0' : 'mt-2'
          }`}>
            <span className="font-medium">{t('prompts.fields.note')}:</span> {prompt.mark}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* 页面标题和添加按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('common.titles.management', { module: t('prompts.module_name') })}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageStagesOpen(true)}>
            <Settings className="h-4 w-4" />
            {t('common.patterns.manage_items', { items: t('prompts.stages_name') })}
          </Button>
          <Button className="text-white" onClick={() => setAddPromptOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('common.patterns.add_item', { item: t('prompts.item_name') })}
          </Button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="flex gap-4 items-center mb-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.messages.search_placeholder', { module: t('prompts.module_name') })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Filter className="h-4 w-4 text-muted-foreground" />
        
        {/* Stage 筛选 */}
        <DropdownMenu onOpenChange={setStageDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between">
              {getSelectedStageName()}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${stageDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedStage('all')}>
              {t('common.all')}
            </DropdownMenuItem>
            {initialStages.map(stage => (
              <DropdownMenuItem 
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
              >
                {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 结果统计 */}
      <div className="mb-2 ml-2">
        <p className="text-sm text-muted-foreground">
          {t('common.messages.total_count', { 
            count: filteredPrompts.length, 
            module: t('prompts.module_name') 
          })}
        </p>
      </div>

      {/* Prompt 列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2">
        <div className="grid gap-4 pb-12">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="px-6 py-4">
              <div className="space-y-3">
                {/* 第一行：Name + Stage tag + Language tag + 操作按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{prompt.name}</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 dark:bg-primary/20 text-primary">
                      {prompt.stage?.name || t('prompts.labels.stage')}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                      {prompt.language}
                    </span>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(prompt)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-red-50 group"
                          onClick={() => handleDelete(prompt)}
                        >
                          <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Prompt 内容（带展开/收起） */}
                <PromptContent prompt={prompt} />
              </div>
            </Card>
          ))}
          
          {filteredPrompts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t('common.messages.no_results', { module: t('prompts.module_name') })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 管理 Stages 对话框 */}
      <ManageStagesDialog
        open={manageStagesOpen}
        onOpenChange={setManageStagesOpen}
        stages={initialStages}
      />

      {/* 添加 Prompt 对话框 */}
      <AddPromptDialog
        open={addPromptOpen}
        onOpenChange={setAddPromptOpen}
        stages={initialStages}
      />

      {/* 编辑 Prompt 对话框 */}
      <EditPromptDialog
        open={editPromptOpen}
        onOpenChange={setEditPromptOpen}
        prompt={selectedPrompt}
        stages={initialStages}
      />

      {/* 删除 Prompt 对话框 */}
      <ConfirmDeleteDialog
        open={deletePromptOpen}
        onOpenChange={setDeletePromptOpen}
        title={getDeleteText()}
        onConfirm={executeDelete}
      />
    </div>
  );
}
