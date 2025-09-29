'use client';

import { useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, X, Save, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { TopicCategory, TopicSubcategory } from './page';
import { getHydrationSafeCategoryDisplayName, getHydrationSafeSubcategoryDisplayName } from './utils';
import { 
  createTopicCategory, 
  updateTopicCategory, 
  deleteTopicCategory,
  createTopicSubcategory,
  updateTopicSubcategory,
  deleteTopicSubcategory
} from './actions';
import { ConfirmDeleteDialog } from '../knowledge/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
          displayName: getHydrationSafeSubcategoryDisplayName(sub, currentLanguage, isMounted)
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
    // 滚动到编辑项，确保输入框完整可见
    setTimeout(() => {
      const editingElement = document.querySelector(`[data-item-id="${item.id}"]`);
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
    setNewItemData({ name_en: '', name_zh: '', name_vi: '' });
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新项
      if (!newItemData.name_en.trim() || !newItemData.name_zh.trim() || !newItemData.name_vi.trim()) {
        alert(t('common.validation.all_required', { field: 'language names' }));
        return;
      }
      
      let result;
      if (isEditingSubcategories) {
        // 添加 Subcategory
        result = await createTopicSubcategory({
          category_id: selectedCategoryId!,
          name_en: newItemData.name_en.trim(),
          name_zh: newItemData.name_zh.trim(),
          name_vi: newItemData.name_vi.trim(),
        });
      } else {
        // 添加 Category
        result = await createTopicCategory({
          name_en: newItemData.name_en.trim(),
          name_zh: newItemData.name_zh.trim(),
          name_vi: newItemData.name_vi.trim(),
        });
      }

      if (result.success) {
        cancelEdit();
      } else {
        alert(result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有项 - 一次性更新所有三个语言字段
      if (!editingData) return;

      // 验证至少有一个语言字段有值
      if (!editingData.name_zh.trim() && !editingData.name_en.trim() && !editingData.name_vi.trim()) {
        alert(t('common.validation.all_required', { field: 'language names' }));
        return;
      }

      let result;
      if (isEditingSubcategories) {
        // 更新 Subcategory - 需要所有语言字段
        result = await updateTopicSubcategory({
          id: editingData.id,
          category_id: selectedCategoryId!,
          name_en: editingData.name_en.trim(),
          name_zh: editingData.name_zh.trim(),
          name_vi: editingData.name_vi.trim(),
        });
      } else {
        // 更新 Category - 更新所有语言字段
        result = await updateTopicCategory({
          id: editingData.id,
          name_en: editingData.name_en.trim(),
          name_zh: editingData.name_zh.trim(),
          name_vi: editingData.name_vi.trim(),
        });
      }

      if (result.success) {
        cancelEdit();
      } else {
        alert(result.error || t('common.validation.update_failed'));
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
      setDeleteConfirm(null);
    } else {
      alert(result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新项
  const startAddNew = () => {
    setIsAddingNew(true);
    setNewItemData({ name_en: '', name_zh: '', name_vi: '' });
    // 滚动到新增项
    setTimeout(() => {
      const newItemElement = document.querySelector('[data-new-item="true"]');
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
            <DialogTitle>{t('common.patterns.manage_items', { items: t('topics.categories_name') })}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Category 选择器 */}
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

            {/* 列表标题 */}
            <div className="text-sm text-muted-foreground">
              {isEditingSubcategories 
                ? `${t('common.messages.editing', { items: getSelectedCategoryName() })}`
                : t('common.messages.editing', { items: t('topics.labels.category') })
              }
            </div>

            {/* 项目列表 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {displayItems.map((item) => (
                  <Card key={item.id} data-item-id={item.id} className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      {editingId === item.id ? (
                        // 编辑模式
                        <div className="flex-1 flex flex-col gap-2 pt-2">
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
                          <div className="flex gap-1 justify-end">
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
                            {item.displayName}
                          </span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-red-50 group"
                              onClick={() => setDeleteConfirm({
                                id: item.id,
                                name: item.displayName
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

                {/* 添加新项 */}
                {isAddingNew ? (
                  <Card data-new-item="true" className="py-2 px-4">
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
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="default" className="h-8 w-8 p-0 text-white" onClick={saveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed h-[46px]"
                    onClick={startAddNew}
                    disabled={isEditingSubcategories && !selectedCategoryId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.patterns.add_item', { 
                      item: isEditingSubcategories ? t('topics.labels.subcategory') : t('topics.labels.category')
                    })}
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
          type: isEditingSubcategories ? t('topics.labels.subcategory') : t('topics.labels.category'),
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}
