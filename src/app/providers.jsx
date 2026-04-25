// View layer composition: wraps the app with global providers (state, theming, etc.)
// In MVVM, this stays UI-focused and does not contain domain business logic.
import { QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import { queryClient } from '../query/queryClient.js'
import { UiStoreProvider } from '../store/uiStore.jsx'

// Using a component instead of directly composing providers in App
// keeps the root view uncluttered and makes it easy to extend later.
export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FF7D29',
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
      }}
    >
      <UiStoreProvider>{children}</UiStoreProvider>
    </ConfigProvider>
    </QueryClientProvider>
  )
}

