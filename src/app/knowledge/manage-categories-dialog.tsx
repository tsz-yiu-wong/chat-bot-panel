'use client';

import { useState } from 'react';
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
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);

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
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
    setIsAddingNew(false);
    setNewCategoryName('');
  };

  // 保存编辑或新增
  const saveEdit = async () => {
    if (isAddingNew) {
      // 添加新分类
      if (!newCategoryName.trim()) {
        alert(t('knowledge.validation.category_name_required'));
        return;
      }
      
      const result = await createKnowledgeCategory({
        knowledge_type: selectedType,
        name_en: newCategoryName.trim(),
        name_zh: newCategoryName.trim(),
        name_vi: newCategoryName.trim(),
      });

      if (result.success) {
        setIsAddingNew(false);
        setNewCategoryName('');
      } else {
        alert(result.error || t('knowledge.validation.create_failed'));
      }
    } else {
      // 更新现有分类 - 只更新当前语言的字段
      if (!editingData) {
        alert('请输入分类名称');
        return;
      }

      const updateData: any = {
        id: editingData.id,
        knowledge_type: selectedType,
      };

      // 根据当前语言只更新对应的字段
      let valueToUpdate = '';
      if (currentLanguage === 'zh') {
        valueToUpdate = editingData.name_zh || '';
        updateData.name_zh = valueToUpdate.trim();
      } else if (currentLanguage === 'vi') {
        valueToUpdate = editingData.name_vi || '';
        updateData.name_vi = valueToUpdate.trim();
      } else {
        valueToUpdate = editingData.name_en || '';
        updateData.name_en = valueToUpdate.trim();
      }

      if (!valueToUpdate.trim()) {
        alert(t('knowledge.validation.category_name_required'));
        return;
      }

      const result = await updateKnowledgeCategory(updateData);

      if (result.success) {
        setEditingId(null);
        setEditingData(null);
      } else {
        alert(result.error || t('knowledge.validation.update_failed'));
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
      alert(result.error || t('knowledge.validation.delete_failed'));
    }
  };

  // 开始添加新分类
  const startAddNewCategory = () => {
    setIsAddingNew(true);
    setNewCategoryName('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('knowledge.dialogs.manage_categories')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* 类型选择 */}
            <KnowledgeTypeSelector
              value={selectedType}
              onChange={setSelectedType}
            />

            {/* 分类列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <Card key={category.id} className="p-3">
                    <div className="flex items-center justify-between">
                      {editingId === category.id ? (
                        // 编辑模式
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={
                              currentLanguage === 'zh' ? (editingData?.name_zh || '') :
                              currentLanguage === 'vi' ? (editingData?.name_vi || '') :
                              (editingData?.name_en || '')
                            }
                            onChange={(e) => setEditingData(prev => {
                              if (!prev) return null;
                              if (currentLanguage === 'zh') {
                                return { ...prev, name_zh: e.target.value };
                              } else if (currentLanguage === 'vi') {
                                return { ...prev, name_vi: e.target.value };
                              } else {
                                return { ...prev, name_en: e.target.value };
                              }
                            })}
                            placeholder={
                              currentLanguage === 'zh' ? t('knowledge.placeholders.chinese_name') :
                              currentLanguage === 'vi' ? t('knowledge.placeholders.vietnamese_name') :
                              t('knowledge.placeholders.english_name')
                            }
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
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder={t('knowledge.placeholders.enter_category_name', { type: selectedType === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene') })}
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
                    onClick={startAddNewCategory}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedType === 'abbreviation' ? t('knowledge.buttons.add_category') : t('knowledge.buttons.add_scene')}
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
        title={deleteConfirm ? t('knowledge.actions.delete_confirm', { type: selectedType, name: deleteConfirm.name }) : ''}
        onConfirm={handleDelete}
      />
    </>
  );
}
