import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        '/health': env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
      },
    },
  };
});
