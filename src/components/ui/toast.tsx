'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Toast 类型定义
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container
function ToastContainer({ 
  toasts, 
  removeToast 
}: { 
  toasts: Toast[]; 
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// Toast Item
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const typeStyles = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto animate-in slide-in-from-right-full',
        typeStyles[toast.type],
        'min-w-[300px] max-w-[500px]'
      )}
    >
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button
        onClick={onClose}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// useToast Hook
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
