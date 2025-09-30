'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

import { PromptStage } from './page';
import { 
  createStage, 
  updateStage, 
  deleteStage 
} from './actions';
import { BaseManageDialog } from '@/components/shared/base-manage-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';

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
  const { addToast } = useToast();
  const { userRole } = useUser();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingStage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newStageName, setNewStageName] = useState<string>('');

  // 将 stages 转换为带 displayName 的格式
  const stagesWithDisplayName = stages.map(stage => ({
    ...stage,
    displayName: stage.name
  }));

  // 开始编辑
  const startEdit = (stage: typeof stagesWithDisplayName[0]) => {
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
        addToast('warning', t('common.validation.field_required', { field: t('prompts.labels.stage') }));
        return;
      }
      
      const result = await createStage({
        name: newStageName.trim()
      });

      if (result.success) {
        addToast('success', t('common.messages.create_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有 Stage
      if (!editingData || !editingData.name.trim()) {
        addToast('warning', t('common.validation.field_required', { field: t('prompts.labels.stage') }));
        return;
      }

      const result = await updateStage({
        id: editingData.id,
        name: editingData.name.trim()
      });

      if (result.success) {
        addToast('success', t('common.messages.update_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.update_failed'));
      }
    }
  };

  // 删除 Stage
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const result = await deleteStage(deleteConfirm.id);
    
    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeleteConfirm(null);
    } else {
      addToast('error', result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新 Stage
  const startAddNewStage = () => {
    setIsAddingNew(true);
    setNewStageName('');
  };

  return (
    <>
      <BaseManageDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('common.patterns.manage_items', { items: t('prompts.stages_name') })}
        items={stagesWithDisplayName}
        renderDisplayItem={(stage) => (
          <span className="text-sm font-medium">
            {stage.name}
          </span>
        )}
        renderEditForm={(stage) => (
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={editingData?.name || ''}
              onChange={(e) => setEditingData(prev => 
                prev ? { ...prev, name: e.target.value } : null
              )}
              placeholder={t('common.placeholders.enter_field', { field: t('prompts.labels.stage') })}
              className="flex-1 bg-muted"
            />
          </div>
        )}
        renderAddForm={() => (
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder={t('common.placeholders.enter_field', { field: t('prompts.labels.stage') })}
              className="flex-1 bg-muted"
              autoFocus
            />
          </div>
        )}
        editingId={editingId}
        isAddingNew={isAddingNew}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSave={saveEdit}
        onDelete={(stage) => setDeleteConfirm({ id: stage.id, name: stage.name })}
        onStartAdd={startAddNewStage}
        addButtonText={t('common.patterns.add_item', { item: t('prompts.labels.stage') })}
        showEditButton={canEdit}
        showDeleteButton={canDelete}
      />

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