import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/tareas': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => {
          if (path.startsWith('/tareas/') && path.endsWith('.json')) {
            return path.replace(/^\//, '');
          }
          return path.replace(/^\/tareas/, '');
        },
      },
      '/papelera': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});