'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface FormFieldCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * 表单字段卡片包装器
 * 为输入字段提供统一的卡片样式和阴影效果
 */
export function FormFieldCard({ children, className = '' }: FormFieldCardProps) {
  return (
    <Card className={`p-4 shadow-sm ${className}`}>
      {children}
    </Card>
  );
}
