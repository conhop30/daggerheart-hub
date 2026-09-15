import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative, not absolute, asset paths — the packaged app loads
  // dist/index.html over file://, where a leading "/" resolves to the
  // filesystem root instead of the dist folder, silently breaking every
  // asset reference (confirmed: this is exactly what happened on the first
  // packaged-build smoke test — a blank window, script never loaded).
  base: './',
  server: {
    port: 5173,
  },
});
