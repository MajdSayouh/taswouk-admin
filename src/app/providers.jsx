// View layer composition: wraps the app with global providers (state, theming, i18n, Ant locale + RTL).
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { App, ConfigProvider, theme, notification as notificationStatic } from 'antd'
import arEG from 'antd/locale/ar_EG'
import enUS from 'antd/locale/en_US'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { queryClient } from '../query/queryClient.js'
import { UiStoreProvider } from '../store/uiStore.jsx'
import i18n from '../i18n/i18n.js'
import { BellOutlined, ShoppingOutlined } from '@ant-design/icons'
import {
  registerDashboardFcmForegroundHandler,
  unregisterDashboardFcmForegroundHandler,
} from '../firebase/fcmUiBridge.js'

const antTheme = {
  token: {
    colorPrimary: '#FF7D29',
    /** Default link blue — override so link buttons / Typography.Link match brand (not #1677FF). */
    colorLink: '#FF7D29',
    borderRadius: 10,
    colorTextBase: '#0f172a',
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBorder: '#e2e8f0',
    colorFillAlter: '#f8fafc',
  },
  algorithm: theme.defaultAlgorithm,
  components: {
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSortActiveBg: '#f1f5f9',
      headerSortHoverBg: '#f1f5f9',
      rowHoverBg: '#f8fafc',
      borderColor: '#e2e8f0',
    },
    Tag: {
      borderRadiusSM: 999,
    },
  },
}

/** Registers Ant Design `App.useApp().notification` for Firebase foreground toasts. */
function DashboardFcmNotificationBridge() {
  const { notification } = App.useApp()

  useEffect(() => {
    notificationStatic.config({
      placement: 'topRight',
      top: 72,
      duration: 6,
      maxCount: 8,
      getContainer: () => document.body,
    })
  }, [])

  useEffect(() => {
    registerDashboardFcmForegroundHandler(
      ({ title, description, placement, url, variant }) => {
        const isOrder = variant === 'order'
        notification.open({
          className: 'dashboard-fcm-push-notification',
          icon: isOrder ? (
            <ShoppingOutlined style={{ color: '#c2410c', fontSize: 22 }} />
          ) : (
            <BellOutlined style={{ color: '#15803d', fontSize: 22 }} />
          ),
          message: title,
          description,
          placement,
          duration: 0,
          onClick: () => {
            if (url) window.location.href = url
          },
        })
      },
    )
    return () => {
      unregisterDashboardFcmForegroundHandler()
    }
  }, [notification])

  return null
}

function I18nAntShell({ children }) {
  const { i18n: i18nInstance } = useTranslation()
  const [lng, setLng] = useState(() => i18nInstance.resolvedLanguage || i18nInstance.language || 'ar')

  useEffect(() => {
    const apply = (l) => {
      const raw = l || 'ar'
      const code = String(raw).split('-')[0]
      setLng(raw)
      const isAr = code === 'ar'
      document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr')
      document.documentElement.setAttribute('lang', isAr ? 'ar' : 'en')
    }
    apply(i18nInstance.language)
    i18nInstance.on('languageChanged', apply)
    return () => {
      i18nInstance.off('languageChanged', apply)
    }
  }, [i18nInstance])

  const locale = String(lng || 'ar').startsWith('ar') ? arEG : enUS
  return (
    <ConfigProvider locale={locale} theme={antTheme}>
      <App message={{ top: 72, duration: 6, maxCount: 5 }} notification={{ placement: 'topRight', top: 72, duration: 6 }}>
        <DashboardFcmNotificationBridge />
        <UiStoreProvider>{children}</UiStoreProvider>
      </App>
    </ConfigProvider>
  )
}

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <I18nAntShell>{children}</I18nAntShell>
      </I18nextProvider>
    </QueryClientProvider>
  )
}
