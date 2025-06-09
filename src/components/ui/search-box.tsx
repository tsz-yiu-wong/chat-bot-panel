'use client'

import { Search } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const SearchBox = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={ref}
          type="text"
          className={cn(
            'w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[var(--component-background)] dark:text-white',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

SearchBox.displayName = 'SearchBox' 