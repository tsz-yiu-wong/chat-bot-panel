'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { TopicCategory, TopicSubcategory } from './page';
import { getHydrationSafeCategoryDisplayName } from './utils';
import { 
  createTopicCategory, 
  updateTopicCategory, 
  deleteTopicCategory,
  createTopicSubcategory,
  updateTopicSubcategory,
  deleteTopicSubcategory
} from './actions';
import { BaseManageDialog } from '@/components/shared/base-manage-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TopicCategory[];
  subcategories: TopicSubcategory[];
  currentLanguage: string;
}

interface EditingItem {
  id: string;
  name_en: string;
  name_zh: string;
  name_vi: string;
}

export function ManageCategoriesDialog({ 
  open, 
  onOpenChange, 
  categories,
  subcategories,
  currentLanguage 
}: ManageCategoriesDialogProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  const { userRole } = useUser();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;
  
  // null 表示编辑 Categories，否则表示编辑选中 Category 的 Subcategories
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newItemData, setNewItemData] = useState<{ name_en: string; name_zh: string; name_vi: string }>({
    name_en: '',
    name_zh: '',
    name_vi: ''
  });
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);

  // 是否在编辑 Subcategories
  const isEditingSubcategories = selectedCategoryId !== null;

  // 获取要显示的列表
  const displayItems = useMemo(() => {
    if (isEditingSubcategories) {
      // 显示选中 Category 的 Subcategories
      return subcategories
        .filter(sub => sub.category_id === selectedCategoryId)
        .map(sub => ({
          id: sub.id,
          name_en: sub.name_en,
          name_zh: sub.name_zh,
          name_vi: sub.name_vi,
          displayName: sub.name_zh || sub.name_en || ''
        }));
    } else {
      // 显示 Categories
      return categories.map(cat => ({
        id: cat.id,
        name_en: cat.name_en || '',
        name_zh: cat.name_zh || '',
        name_vi: cat.name_vi || '',
        displayName: getHydrationSafeCategoryDisplayName(cat, currentLanguage, isMounted)
      }));
    }
  }, [isEditingSubcategories, selectedCategoryId, categories, subcategories, currentLanguage, isMounted]);

  // 获取选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!selectedCategoryId) return t('topics.labels.none_selected');
    const category = categories.find(cat => cat.id === selectedCategoryId);
    return category ? getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted) : t('topics.labels.none_selected');
  };

  // 开始编辑
  const startEdit = (item: typeof displayItems[0]) => {
    setEditingId(item.id);
    setEditingData({
      id: item.id,
      name_en: item.name_en,
      name_zh: item.name_zh,
      name_vi: item.name_vi,
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
    setIsAddingNew(false);
    setNewItemData({ name_en: '', name_zh: '', name_vi: '' });
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新项
      if (!newItemData.name_en.trim() || !newItemData.name_zh.trim() || !newItemData.name_vi.trim()) {
        addToast('warning', t('common.validation.all_required', { field: 'language names' }));
        return;
      }
      
      let result;
      if (isEditingSubcategories) {
        result = await createTopicSubcategory({
          category_id: selectedCategoryId!,
          name_en: newItemData.name_en.trim(),
          name_zh: newItemData.name_zh.trim(),
          name_vi: newItemData.name_vi.trim(),
        });
      } else {
        result = await createTopicCategory({
          name_en: newItemData.name_en.trim(),
          name_zh: newItemData.name_zh.trim(),
          name_vi: newItemData.name_vi.trim(),
        });
      }

      if (result.success) {
        addToast('success', t('common.messages.create_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有项
      if (!editingData) return;

      if (!editingData.name_zh.trim() && !editingData.name_en.trim() && !editingData.name_vi.trim()) {
        addToast('warning', t('common.validation.all_required', { field: 'language names' }));
        return;
      }

      let result;
      if (isEditingSubcategories) {
        result = await updateTopicSubcategory({
          id: editingData.id,
          category_id: selectedCategoryId!,
          name_en: editingData.name_en.trim(),
          name_zh: editingData.name_zh.trim(),
          name_vi: editingData.name_vi.trim(),
        });
      } else {
        result = await updateTopicCategory({
          id: editingData.id,
          name_en: editingData.name_en.trim(),
          name_zh: editingData.name_zh.trim(),
          name_vi: editingData.name_vi.trim(),
        });
      }

      if (result.success) {
        addToast('success', t('common.messages.update_success'));
        cancelEdit();
      } else {
        addToast('error', result.error || t('common.validation.update_failed'));
      }
    }
  };

  // 删除项
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    let result;
    if (isEditingSubcategories) {
      result = await deleteTopicSubcategory(deleteConfirm.id);
    } else {
      result = await deleteTopicCategory(deleteConfirm.id);
    }
    
    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeleteConfirm(null);
    } else {
      addToast('error', result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新项
  const startAddNew = () => {
    setIsAddingNew(true);
    setNewItemData({ name_en: '', name_zh: '', name_vi: '' });
  };

  return (
    <>
      <BaseManageDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('common.patterns.manage_items', { items: t('topics.categories_name') })}
        items={displayItems}
        headerSelectors={
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium shrink-0">
              {t('topics.labels.category')}:
            </span>
            <DropdownMenu onOpenChange={setCategoryDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[120px] max-w-[calc(100%-150px)]">
                  <span className="truncate">{getSelectedCategoryName()}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 ml-2 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full">
                <DropdownMenuItem onClick={() => setSelectedCategoryId(null)}>
                  {t('topics.labels.none_selected')}
                </DropdownMenuItem>
                {categories.map(category => (
                  <DropdownMenuItem 
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    {getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        hintText={isEditingSubcategories 
          ? `${t('common.messages.editing', { items: getSelectedCategoryName() })}`
          : t('common.messages.editing', { items: t('topics.labels.category') })
        }
        renderDisplayItem={(item) => (
          <span className="text-sm font-medium">
            {item.displayName}
          </span>
        )}
        renderEditForm={(item) => (
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
              value={newItemData.name_zh}
              onChange={(e) => setNewItemData(prev => ({ ...prev, name_zh: e.target.value }))}
              placeholder={t('common.fields.chinese_name')}
              className="bg-muted"
              autoFocus
            />
            <Input
              value={newItemData.name_en}
              onChange={(e) => setNewItemData(prev => ({ ...prev, name_en: e.target.value }))}
              placeholder={t('common.fields.english_name')}
              className="bg-muted"
            />
            <Input
              value={newItemData.name_vi}
              onChange={(e) => setNewItemData(prev => ({ ...prev, name_vi: e.target.value }))}
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
        onDelete={(item) => setDeleteConfirm({ id: item.id, name: item.displayName })}
        onStartAdd={startAddNew}
        addButtonText={t('common.patterns.add_item', { 
          item: isEditingSubcategories ? t('topics.labels.subcategory') : t('topics.labels.category')
        })}
        disableAdd={isEditingSubcategories && !selectedCategoryId}
        showEditButton={canEdit}
        showDeleteButton={canDelete}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title={deleteConfirm ? t('common.actions.delete_confirm', { 
          type: isEditingSubcategories ? t('topics.labels.subcategory') : t('topics.labels.category'),
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}