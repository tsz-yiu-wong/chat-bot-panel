'use client'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  className?: string
}

export function LoadingSpinner({ size = 'medium', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className={`mt-2 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  )
}

// 页面级别的加载组件
interface PageLoadingProps {
  text?: string
}

export function PageLoading({ text = '加载中...' }: PageLoadingProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="large" text={text} />
    </div>
  )
} 