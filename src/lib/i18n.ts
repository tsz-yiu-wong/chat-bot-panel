'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 预加载语言资源，避免异步加载延迟
import zhResources from '../../public/locales/zh.json';
import enResources from '../../public/locales/en.json';
import viResources from '../../public/locales/vi.json';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'zh', // 设置中文为默认语言
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
