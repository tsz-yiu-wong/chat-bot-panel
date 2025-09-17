'use client';

import * as React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';

export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    //
    return (
      <div className="grid h-10 w-full grid-cols-3 gap-1 rounded-lg border p-1" />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-full hover:text-foreground',
          theme === 'light' && 'bg-muted font-bold text-primary hover:text-primary'
        )}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-full hover:text-foreground',
          theme === 'dark' && 'bg-muted font-bold text-primary hover:text-primary'
        )}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-full hover:text-foreground',
          theme === 'system' && 'bg-muted font-bold text-primary hover:text-primary'
        )}
        onClick={() => setTheme('system')}
      >
        <Laptop className="h-4 w-4" />
      </Button>
    </div>
  );
}
