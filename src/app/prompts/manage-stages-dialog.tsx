'use client';

import { useState } from 'react';
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

  // 开始编辑
  const startEdit = (stage: PromptStage) => {
    setEditingId(stage.id);
    setEditingData({
      id: stage.id,
      name: stage.name
    });
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
        alert(t('common.validation.field_required', { field: t('prompts.entity.stage') }));
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
        alert(t('common.validation.field_required', { field: t('prompts.entity.stage') }));
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('prompts.dialogs.manage_stages')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Stage 列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {stages.map((stage) => (
                  <Card key={stage.id} className="p-3">
                    <div className="flex items-center justify-between">
                      {editingId === stage.id ? (
                        // 编辑模式
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingData?.name || ''}
                            onChange={(e) => setEditingData(prev => 
                              prev ? { ...prev, name: e.target.value } : null
                            )}
                            placeholder={t('common.placeholders.enter_field', { field: t('prompts.entity.stage') })}
                            className="flex-1 bg-muted"
                          />
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="default" className="text-white" onClick={saveEdit}>
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
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          placeholder={t('common.placeholders.enter_field', { field: t('prompts.entity.stage') })}
                          className="flex-1 bg-muted"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="default" className="text-white" onClick={saveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed h-[62px]"
                    onClick={startAddNewStage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('prompts.buttons.add_stage')}
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
          type: t('prompts.entity.stage'), 
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}
