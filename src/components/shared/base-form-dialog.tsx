'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface BaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: () => Promise<void> | void;
  isSubmitting: boolean;
  // 选项区域（下拉选择器），可选
  selectors?: ReactNode;
  // 表单字段区域（被 FormFieldCard 包裹的输入框）
  formFields: ReactNode;
  // 可选的自定义底部按钮
  customFooter?: ReactNode;
  // 是否支持滚动内容区域（默认 false，如果内容可能超出可见区域则设为 true）
  scrollableContent?: boolean;
}

/**
 * 基础表单对话框组件
 * 用于 Add/Edit 操作，提供统一的布局和样式
 */
export function BaseFormDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  isSubmitting,
  selectors,
  formFields,
  customFooter,
  scrollableContent = false,
}: BaseFormDialogProps) {
  const { t } = useHydrationSafeTranslation();

  const handleSubmit = async () => {
    await onSubmit();
  };

  const contentClassName = scrollableContent
    ? 'max-w-md max-h-[80vh] overflow-hidden flex flex-col'
    : 'max-w-md';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {scrollableContent ? (
          // 可滚动布局
          <>
            <div className="space-y-4 overflow-y-auto flex-1">
              {selectors && <div className="space-y-4">{selectors}</div>}
              <div className="space-y-4">{formFields}</div>
            </div>
            
            {/* 底部按钮 */}
            {customFooter || (
              <div className="flex pt-4 border-t">
                <div className="flex-1 flex justify-center">
                  <Button
                    variant="outline"
                    className="w-40"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
                <div className="flex-1 flex justify-center">
                  <Button
                    className="w-40 text-white"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('common.status.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          // 普通布局
          <div className="space-y-4">
            {selectors && <div className="space-y-4">{selectors}</div>}
            <div className="space-y-4">{formFields}</div>

            {/* 底部按钮 */}
            {customFooter || (
              <div className="flex pt-4 border-t">
                <div className="flex-1 flex justify-center">
                  <Button
                    variant="outline"
                    className="w-40"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
                <div className="flex-1 flex justify-center">
                  <Button
                    className="w-40 text-white"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('common.status.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
