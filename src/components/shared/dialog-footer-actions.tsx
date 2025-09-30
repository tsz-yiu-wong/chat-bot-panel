'use client';

import { Button } from '@/components/ui/button';

interface DialogFooterActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  confirmText: string;
  cancelText: string;
  confirmVariant?: 'default' | 'destructive';
}

/**
 * Dialog 底部操作按钮
 * 提供统一的 Cancel/Confirm 按钮布局
 */
export function DialogFooterActions({
  onCancel,
  onConfirm,
  isSubmitting,
  confirmText,
  cancelText,
  confirmVariant = 'default'
}: DialogFooterActionsProps) {
  return (
    <div className="flex pt-4 border-t">
      <div className="flex-1 flex justify-center">
        <Button 
          variant="outline" 
          className="w-40"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelText}
        </Button>
      </div>
      <div className="flex-1 flex justify-center">
        <Button 
          variant={confirmVariant}
          className="w-40 text-white"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
}
