'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  neumorphic?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', neumorphic = false, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: neumorphic 
        ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 focus:ring-blue-500 neumorphic hover:neumorphic-pressed active:neumorphic-pressed'
        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 focus:ring-blue-500',
      secondary: neumorphic
        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[var(--accent-background)] dark:hover:bg-[var(--border-color)] dark:text-gray-300 focus:ring-gray-500 neumorphic hover:neumorphic-pressed active:neumorphic-pressed'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[var(--accent-background)] dark:hover:bg-[var(--border-color)] dark:text-gray-300 focus:ring-gray-500',
      danger: neumorphic
        ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 neumorphic hover:neumorphic-pressed active:neumorphic-pressed'
        : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      ghost: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500'
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button' 