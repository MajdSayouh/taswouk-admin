import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const proxyTarget =
    (env.VITE_DEV_API_PROXY_TARGET && String(env.VITE_DEV_API_PROXY_TARGET).trim()) ||
    (env.VITE_API_BASE_URL && String(env.VITE_API_BASE_URL).trim()) ||
    'https://test.taswouk.com'

  return {
    base: '/dashboard/',
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'charts'
            }
            if (id.includes('react-quill') || id.includes('/quill/')) return 'editor'
            if (id.includes('firebase')) return 'firebase'
            if (id.includes('leaflet')) return 'maps'
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('@rc-component')) {
              return 'antd'
            }
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'react-vendor'
            }
            return undefined
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
        // Product images: `/media/products/...` (same host as API in prod; proxy in dev).
        '/media': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
