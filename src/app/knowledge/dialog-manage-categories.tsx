'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

import { KnowledgeCategory } from './page';
import { getHydrationSafeCategoryDisplayName } from './utils';
import { 
  createKnowledgeCategory, 
  updateKnowledgeCategory, 
  deleteKnowledgeCategory 
} from './actions';
import { BaseManageDialog } from '@/components/shared/base-manage-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { KnowledgeTypeSelector } from './selector-knowledge-type';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: KnowledgeCategory[];
  currentLanguage: string;
}

interface EditingCategory {
  id: string;
  name_en?: string;
  name_zh?: string;
  name_vi?: string;
}

export function ManageCategoriesDialog({ 
  open, 
  onOpenChange, 
  categories, 
  currentLanguage 
}: ManageCategoriesDialogProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  const { userRole } = useUser();
  const { addToast } = useToast();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;
  
  const [selectedType, setSelectedType] = useState<'abbreviation' | 'script'>('script');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingCategory | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newCategoryData, setNewCategoryData] = useState<{ name_en: string; name_zh: string; name_vi: string }>({
    name_en: '',
    name_zh: '',
    name_vi: ''
  });

  // 根据选中类型过滤分类
  const filteredCategories = categories
    .filter(cat => cat.knowledge_type === selectedType)
    .map(cat => ({
      ...cat,
      displayName: getHydrationSafeCategoryDisplayName(cat, currentLanguage, isMounted)
    }));

  // 开始编辑
  const startEdit = (category: typeof filteredCategories[0]) => {
    setEditingId(category.id);
    setEditingData({
      id: category.id,
      name_en: category.name_en || undefined,
      name_zh: category.name_zh || undefined,
      name_vi: category.name_vi || undefined,
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
    setIsAddingNew(false);
    setNewCategoryData({ name_en: '', name_zh: '', name_vi: '' });
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新分类
      if (!newCategoryData.name_en.trim() || !newCategoryData.name_zh.trim() || !newCategoryData.name_vi.trim()) {
        addToast('warning', t('common.validation.all_required', { field: 'language names' }));
        return;
      }
      
      const result = await createKnowledgeCategory({
        knowledge_type: selectedType,
        name_en: newCategoryData.name_en.trim(),
        name_zh: newCategoryData.name_zh.trim(),
        name_vi: newCategoryData.name_vi.trim(),
      });

      if (result.success) {
        addToast('success', t('common.messages.create_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有分类
      if (!editingData) return;

      if (!editingData.name_zh?.trim() && !editingData.name_en?.trim() && !editingData.name_vi?.trim()) {
        addToast('warning', t('common.validation.field_required', { 
          field: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene') 
        }));
        return;
      }

      const result = await updateKnowledgeCategory({
        id: editingData.id,
        knowledge_type: selectedType,
        name_en: editingData.name_en?.trim(),
        name_zh: editingData.name_zh?.trim(),
        name_vi: editingData.name_vi?.trim(),
      });

      if (result.success) {
        addToast('success', t('common.messages.update_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.update_failed'));
      }
    }
  };

  // 删除分类
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const result = await deleteKnowledgeCategory(deleteConfirm.id);
    
    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeleteConfirm(null);
    } else {
      addToast('error', result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新分类
  const startAddNewCategory = () => {
    setIsAddingNew(true);
    setNewCategoryData({ name_en: '', name_zh: '', name_vi: '' });
  };

  return (
    <>
      <BaseManageDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('common.patterns.manage_items', { items: t('knowledge.categories_name') })}
        items={filteredCategories}
        headerSelectors={
          <KnowledgeTypeSelector
            value={selectedType}
            onChange={setSelectedType}
          />
        }
        renderDisplayItem={(category) => (
          <span className="text-sm font-medium">
            {category.displayName}
          </span>
        )}
        renderEditForm={(category) => (
          <div className="flex flex-col gap-2 pt-2">
            <Input
              value={editingData?.name_zh || ''}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, name_zh: e.target.value } : null)}
              placeholder={t('common.fields.chinese_name')}
              className="bg-muted"
            />
            <Input
              value={editingData?.name_en || ''}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, name_en: e.target.value } : null)}
              placeholder={t('common.fields.english_name')}
              className="bg-muted"
            />
            <Input
              value={editingData?.name_vi || ''}
              onChange={(e) => setEditingData(prev => prev ? { ...prev, name_vi: e.target.value } : null)}
              placeholder={t('common.fields.vietnamese_name')}
              className="bg-muted"
            />
          </div>
        )}
        renderAddForm={() => (
          <div className="flex flex-col gap-2 pt-2">
            <Input
              value={newCategoryData.name_zh}
              onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_zh: e.target.value }))}
              placeholder={t('common.fields.chinese_name')}
              className="bg-muted"
              autoFocus
            />
            <Input
              value={newCategoryData.name_en}
              onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_en: e.target.value }))}
              placeholder={t('common.fields.english_name')}
              className="bg-muted"
            />
            <Input
              value={newCategoryData.name_vi}
              onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_vi: e.target.value }))}
              placeholder={t('common.fields.vietnamese_name')}
              className="bg-muted"
            />
          </div>
        )}
        editingId={editingId}
        isAddingNew={isAddingNew}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSave={saveEdit}
        onDelete={(category) => setDeleteConfirm({ id: category.id, name: category.displayName })}
        onStartAdd={startAddNewCategory}
        addButtonText={t('common.patterns.add_item', { 
          item: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene') 
        })}
        showEditButton={canEdit}
        showDeleteButton={canDelete}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={deleteConfirm ? t('common.actions.delete_confirm', { 
          type: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene'),
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}