import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

import ja from './locales/ja.json';

// Configure i18next
i18n
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: {
        translation: en,
      },
      'zh-CN': {
        translation: zhCN,
      },
      ja: {
        translation: ja,
      },
    },
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language if translation is missing
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;

