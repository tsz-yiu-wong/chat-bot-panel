'use client';

import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { PromptStage } from './page';
import { 
  createStage, 
  updateStage, 
  deleteStage 
} from './actions';
import { ConfirmDeleteDialog } from '../knowledge/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface ManageStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PromptStage[];
}

interface EditingStage {
  id: string;
  name: string;
}

export function ManageStagesDialog({ 
  open, 
  onOpenChange, 
  stages
}: ManageStagesDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingStage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newStageName, setNewStageName] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 开始编辑
  const startEdit = (stage: PromptStage) => {
    setEditingId(stage.id);
    setEditingData({
      id: stage.id,
      name: stage.name
    });
    // 滚动到编辑项，确保输入框完整可见
    setTimeout(() => {
      const editingElement = document.querySelector(`[data-stage-id="${stage.id}"]`);
      if (editingElement) {
        editingElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
    setIsAddingNew(false);
    setNewStageName('');
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新 Stage
      if (!newStageName.trim()) {
        alert(t('common.validation.field_required', { field: t('prompts.labels.stage') }));
        return;
      }
      
      const result = await createStage({
        name: newStageName.trim()
      });

      if (result.success) {
        setIsAddingNew(false);
        setNewStageName('');
      } else {
        alert(result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有 Stage
      if (!editingData || !editingData.name.trim()) {
        alert(t('common.validation.field_required', { field: t('prompts.labels.stage') }));
        return;
      }

      const result = await updateStage({
        id: editingData.id,
        name: editingData.name.trim()
      });

      if (result.success) {
        setEditingId(null);
        setEditingData(null);
      } else {
        alert(result.error || t('common.validation.update_failed'));
      }
    }
  };

  // 删除 Stage
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const result = await deleteStage(deleteConfirm.id);
    
    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新 Stage
  const startAddNewStage = () => {
    setIsAddingNew(true);
    setNewStageName('');
    // 滚动到新增项
    setTimeout(() => {
      const newItemElement = document.querySelector('[data-new-stage="true"]');
      if (newItemElement) {
        newItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('common.patterns.manage_items', { items: t('prompts.stages_name') })}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Stage 列表 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {stages.map((stage) => (
                  <Card key={stage.id} data-stage-id={stage.id} className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      {editingId === stage.id ? (
                        // 编辑模式
                        <div className="flex-1 flex items-center gap-2 pt-2">
                          <Input
                            value={editingData?.name || ''}
                            onChange={(e) => setEditingData(prev => 
                              prev ? { ...prev, name: e.target.value } : null
                            )}
                            placeholder={t('common.placeholders.enter_field', { field: t('prompts.labels.stage') })}
                            className="flex-1 bg-muted"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="default" className="h-8 w-8 p-0 text-white" onClick={saveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 显示模式
                        <>
                          <span className="text-sm font-medium">
                            {stage.name}
                          </span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(stage)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-red-50 group"
                              onClick={() => setDeleteConfirm({
                                id: stage.id,
                                name: stage.name
                              })}
                            >
                              <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                ))}

                {/* 添加新 Stage */}
                {isAddingNew ? (
                  <Card data-new-stage="true" className="py-2 px-4">
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          placeholder={t('common.placeholders.enter_field', { field: t('prompts.labels.stage') })}
                          className="flex-1 bg-muted"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="default" className="h-8 w-8 p-0 text-white" onClick={saveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed h-[46px]"
                    onClick={startAddNewStage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.patterns.add_item', { item: t('prompts.labels.stage') })}
                  </Button>
                )}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-center pt-4 border-t">
              <Button variant="outline" className="w-40" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={deleteConfirm ? t('common.actions.delete_confirm', { 
          type: t('prompts.labels.stage'), 
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}
