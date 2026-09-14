import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forwards relative /api/... calls from the frontend straight to the
      // Spring Boot backend during dev, so client.ts never has to know the
      // backend's host/port. Update the target here if the backend's local
      // port ever changes — nowhere else should hardcode it.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
