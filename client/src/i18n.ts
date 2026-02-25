import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import nl from './locales/nl.json';

const STORAGE_KEY = 'kanterslaan-lang';

export const languages = ['en', 'nl'] as const;
export type Language = (typeof languages)[number];

const savedLang = localStorage.getItem(STORAGE_KEY) as Language | null;
const initialLang = savedLang && languages.includes(savedLang) ? savedLang : 'nl';

export const i18nReady = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    nl: { translation: nl },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
