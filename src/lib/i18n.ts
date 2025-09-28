'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 预加载语言资源，避免异步加载延迟
import zhResources from '../../public/locales/zh.json';
import enResources from '../../public/locales/en.json';
import viResources from '../../public/locales/vi.json';

// 获取初始语言设置，确保与服务端一致
const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'zh'; // 服务端默认中文
  }
  
  // 客户端：尝试从localStorage获取，否则使用中文
  try {
    return localStorage.getItem('i18nextLng') || 'zh';
  } catch {
    return 'zh';
  }
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    lng: initialLanguage, // 使用确定的初始语言
    fallbackLng: 'zh',
    supportedLngs: ['en', 'zh', 'vi'],
    interpolation: {
      escapeValue: false, // react已经处理了XSS
    },
    // 直接使用预加载的资源，避免网络请求
    resources: {
      zh: { common: zhResources },
      en: { common: enResources },
      vi: { common: viResources },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['common'],
    defaultNS: 'common',
  });

export default i18n;
