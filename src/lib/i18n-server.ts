import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 预加载语言资源
import zhResources from '../../public/locales/zh.json';
import enResources from '../../public/locales/en.json';
import viResources from '../../public/locales/vi.json';

/**
 * 服务端i18n配置
 * 确保服务端渲染时使用固定的语言，避免hydration不匹配
 */
export function createServerI18n(language: string = 'zh') {
  const serverI18n = i18n.createInstance();
  
  serverI18n
    .use(initReactI18next)
    .init({
      lng: language, // 使用传入的语言，默认中文
      fallbackLng: 'zh',
      supportedLngs: ['en', 'zh', 'vi'],
      interpolation: {
        escapeValue: false,
      },
      resources: {
        zh: { common: zhResources },
        en: { common: enResources },
        vi: { common: viResources },
      },
      ns: ['common'],
      defaultNS: 'common',
    });

  return serverI18n;
}

export default createServerI18n;
