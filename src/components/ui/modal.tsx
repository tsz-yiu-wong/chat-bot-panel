'use client'

import { X } from 'lucide-react'
import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-[var(--component-background)] rounded-lg ${maxWidthClasses[maxWidth]} w-full shadow-xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-[var(--border-color)]`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-[var(--component-background)] border-b border-gray-200 dark:border-[var(--border-color)] pb-4 -mx-6 px-6 -mt-6 pt-6 z-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = '确认',
  cancelText = '取消',
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      default:
        return 'bg-red-600 hover:bg-red-700 text-white'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[var(--component-background)] rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-[var(--border-color)]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
} 