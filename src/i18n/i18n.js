import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ar from '../locales/ar/common.json'
import en from '../locales/en/common.json'
import arPages from '../locales/ar/pages.json'
import enPages from '../locales/en/pages.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { common: ar, pages: arPages },
      en: { common: en, pages: enPages },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    defaultNS: 'common',
    ns: ['common', 'pages'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
