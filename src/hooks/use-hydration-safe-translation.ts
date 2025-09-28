'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hydration-safe translation hook
 * 确保服务端和客户端渲染的一致性，避免hydration错误
 * 
 * @param customFallbacks - 自定义fallback文本映射（可选）
 * @returns 包含hydration-safe的t函数和ready状态
 */
export function useHydrationSafeTranslation(customFallbacks: Record<string, string> = {}) {
  const { t: originalT, ready: i18nReady, i18n } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 创建hydration-safe的t函数
  const t = (key: string, fallback?: string | any, options?: any) => {
    // 处理参数：如果第二个参数是对象，则它是options
    let actualFallback = fallback;
    let actualOptions = options;
    
    if (typeof fallback === 'object' && fallback !== null) {
      actualOptions = fallback;
      actualFallback = undefined;
    }
    
    // 服务端渲染或i18n未就绪时使用fallback
    if (!isMounted || !i18nReady) {
      return actualFallback || customFallbacks[key] || key;
    }
    
    // 客户端hydration完成后使用实际翻译
    return originalT(key, actualOptions);
  };

  return {
    t,
    ready: isMounted && i18nReady,
    isMounted,
    currentLanguage: i18n.language,
  };
}
