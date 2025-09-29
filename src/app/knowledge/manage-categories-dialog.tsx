'use client';

import { useState, useRef } from 'react';
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

import { KnowledgeCategory } from './page';
import { getHydrationSafeCategoryDisplayName } from './utils';
import { 
  createKnowledgeCategory, 
  updateKnowledgeCategory, 
  deleteKnowledgeCategory 
} from './actions';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { KnowledgeTypeSelector } from './components/knowledge-type-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

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
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 根据选中类型过滤分类
  const filteredCategories = categories.filter(cat => cat.knowledge_type === selectedType);

  // 开始编辑
  const startEdit = (category: KnowledgeCategory) => {
    setEditingId(category.id);
    // 保留原有的所有语言数据，不要覆盖
    setEditingData({
      id: category.id,
      name_en: category.name_en || undefined,
      name_zh: category.name_zh || undefined,
      name_vi: category.name_vi || undefined,
    });
    // 滚动到编辑项，确保输入框完整可见
    setTimeout(() => {
      const editingElement = document.querySelector(`[data-category-id="${category.id}"]`);
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
    setNewCategoryData({ name_en: '', name_zh: '', name_vi: '' });
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新分类
      if (!newCategoryData.name_en.trim() || !newCategoryData.name_zh.trim() || !newCategoryData.name_vi.trim()) {
        alert(t('common.validation.all_required', { field: 'language names' }));
        return;
      }
      
      const result = await createKnowledgeCategory({
        knowledge_type: selectedType,
        name_en: newCategoryData.name_en.trim(),
        name_zh: newCategoryData.name_zh.trim(),
        name_vi: newCategoryData.name_vi.trim(),
      });

      if (result.success) {
        cancelEdit();
      } else {
        alert(result.error || t('common.validation.create_failed'));
      }
    } else {
      // 更新现有分类 - 一次性更新所有三个语言字段
      if (!editingData) {
        alert('请输入分类名称');
        return;
      }

      // 验证至少有一个语言字段有值
      if (!editingData.name_zh?.trim() && !editingData.name_en?.trim() && !editingData.name_vi?.trim()) {
        alert(t('common.validation.field_required', { 
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
        setEditingId(null);
        setEditingData(null);
      } else {
        alert(result.error || t('common.validation.update_failed'));
      }
    }
  };

  // 删除分类
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const result = await deleteKnowledgeCategory(deleteConfirm.id);
    
    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(result.error || t('common.validation.delete_failed'));
    }
  };

  // 开始添加新分类
  const startAddNewCategory = () => {
    setIsAddingNew(true);
    setNewCategoryData({ name_en: '', name_zh: '', name_vi: '' });
    // 滚动到新增项
    setTimeout(() => {
      const newItemElement = document.querySelector('[data-new-category="true"]');
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
            <DialogTitle>{t('common.patterns.manage_items', { items: t('knowledge.categories_name') })}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* 类型选择 */}
            <KnowledgeTypeSelector
              value={selectedType}
              onChange={setSelectedType}
            />

            {/* 分类列表 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <Card key={category.id} data-category-id={category.id} className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      {editingId === category.id ? (
                        // 编辑模式 - 三个输入框
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
                            {getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted)}
                          </span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-red-50 group"
                              onClick={() => setDeleteConfirm({
                                id: category.id,
                                name: getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted)
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

                {/* 添加新分类 */}
                {isAddingNew ? (
                  <Card data-new-category="true" className="py-2 px-4">
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
                    onClick={startAddNewCategory}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.patterns.add_item', { 
                      item: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene') 
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
          type: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene'),
          name: deleteConfirm.name 
        }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}
