'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(HttpApi)
  .init({
    // lng: 'zh', // 如果未检测到语言，则默认使用此语言
    fallbackLng: 'en', // 如果当前语言的翻译缺失，则使用此语言
    supportedLngs: ['en', 'zh', 'vi'],
    // debug: true, // 在开发环境中开启debug模式
    interpolation: {
      escapeValue: false, // react已经处理了XSS
    },
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['common'],
    defaultNS: 'common',
  });

export default i18n;
