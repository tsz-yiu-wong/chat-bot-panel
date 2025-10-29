/**
 * 数据语言配置中心
 * 
 * 系统支持的所有数据语言列表，与数据库 language_type ENUM 保持一致
 * 位置：database/00_helpers.sql
 * 
 * 注意：这里的语言是指数据的语言，不是前端页面 UI 的多语言
 */

/**
 * 系统支持的完整语言列表
 * 用于：Add/Edit Dialog 的语言选择器
 */
export const SUPPORTED_LANGUAGES = [
  'en',
  'zh-cn', 
  'zh-tw',
  'ja',
  'ko',
  'vi'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * 语言显示名称映射（可选）
 * 如果需要更友好的 UI 显示，可以取消注释使用
 * 同时需要在 LanguageSelector 组件中取消映射代码的注释
 */
// export const LANGUAGE_LABELS: Record<string, string> = {
//   'en': 'English',
//   'zh-cn': '简体中文',
//   'zh-tw': '繁體中文',
//   'ja': '日本語',
//   'ko': '한국어',
//   'vi': 'Tiếng Việt'
// };

