'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface BaseManageDialogProps<T extends { id: string }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: Array<T & { displayName: string }>;
  // 顶部选择器（如 Knowledge 的类型选择、Topics 的分类选择）
  headerSelectors?: ReactNode;
  // 提示文本（在选择器下方）
  hintText?: string;
  // 渲染每个 item 的显示状态
  renderDisplayItem: (item: T & { displayName: string }) => ReactNode;
  // 渲染编辑表单
  renderEditForm: (item: T & { displayName: string }) => ReactNode;
  // 渲染新增表单
  renderAddForm: () => ReactNode;
  // 当前编辑的 item ID
  editingId: string | null;
  // 是否正在添加新项
  isAddingNew: boolean;
  // 开始编辑
  onStartEdit: (item: T & { displayName: string }) => void;
  // 取消编辑
  onCancelEdit: () => void;
  // 保存编辑或新增
  onSave: () => void;
  // 删除项
  onDelete: (item: T & { displayName: string }) => void;
  // 开始添加
  onStartAdd: () => void;
  // 添加按钮文字
  addButtonText: string;
  // 是否禁用添加按钮
  disableAdd?: boolean;
  // 是否显示 Edit/Delete 按钮（基于权限）
  showEditButton?: boolean;
  showDeleteButton?: boolean;
}

/**
 * 基础管理对话框组件
 * 用于 Manage 操作（如管理分类、Stage 等），提供统一的布局和样式
 */
export function BaseManageDialog<T extends { id: string }>({
  open,
  onOpenChange,
  title,
  items,
  headerSelectors,
  hintText,
  renderDisplayItem,
  renderEditForm,
  renderAddForm,
  editingId,
  isAddingNew,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onStartAdd,
  addButtonText,
  disableAdd = false,
  showEditButton = true,
  showDeleteButton = true,
}: BaseManageDialogProps<T>) {
  const { t } = useHydrationSafeTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到编辑项或新增项
  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        const editingElement = document.querySelector(`[data-item-id="${editingId}"]`);
        if (editingElement) {
          editingElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 0);
    } else if (isAddingNew) {
      setTimeout(() => {
        const newItemElement = document.querySelector('[data-new-item="true"]');
        if (newItemElement) {
          newItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 0);
    }
  }, [editingId, isAddingNew]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* 顶部选择器 */}
          {headerSelectors && <div>{headerSelectors}</div>}

          {/* 提示文本 */}
          {hintText && (
            <div className="text-sm text-muted-foreground">
              {hintText}
            </div>
          )}

          {/* 项目列表 */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {items.map((item) => (
                <Card 
                  key={item.id} 
                  data-item-id={item.id} 
                  className={`px-4 ${showEditButton || showDeleteButton ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center justify-between">
                    {editingId === item.id ? (
                      // 编辑模式
                      <div className="flex-1">
                        {renderEditForm(item)}
                        <div className="flex gap-1 justify-end mt-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="default" className="h-8 w-8 p-0 text-white" onClick={onSave}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <>
                        <div className="flex-1">
                          {renderDisplayItem(item)}
                        </div>
                        {(showEditButton || showDeleteButton) && (
                          <div className="flex gap-1">
                            {showEditButton && (
                              <Button size="icon" variant="ghost" onClick={() => onStartEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {showDeleteButton && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="hover:bg-red-50 group"
                                onClick={() => onDelete(item)}
                              >
                                <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              ))}

              {/* 添加新项 */}
              {isAddingNew ? (
                <Card data-new-item="true" className="py-2 px-4">
                  <div className="flex flex-col">
                    {renderAddForm()}
                    <div className="flex gap-1 justify-end mt-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="default" className="h-8 w-8 p-0 text-white" onClick={onSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed h-[46px]"
                  onClick={onStartAdd}
                  disabled={disableAdd}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {addButtonText}
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
  );
}
