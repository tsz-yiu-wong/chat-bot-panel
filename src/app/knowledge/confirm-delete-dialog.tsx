'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDeleteDialog({ 
  open, 
  onOpenChange, 
  title,
  onConfirm
}: ConfirmDeleteDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{t('common.delete')} Confirmation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <p className="text-center my-4">
            {title}
          </p>
          <div className="flex pt-4 border-t w-full">
            <div className="flex-1 flex justify-center">
              <Button 
                variant="outline" 
                className="w-40"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <Button 
                variant="destructive" 
                className="w-40"
                onClick={handleConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? t('common.status.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
