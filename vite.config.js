import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    (env.VITE_DEV_API_PROXY_TARGET && String(env.VITE_DEV_API_PROXY_TARGET).trim()) ||
    (env.VITE_API_BASE_URL && String(env.VITE_API_BASE_URL).trim()) ||
    'https://test.taswouk.com'

  return {
    plugins: [react()],
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
