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
    // Off Vite's universal default (5173) specifically to reduce collisions
    // with other, unrelated projects' dev servers running at the same time
    // (e.g. another agent's session on a different scaffold) — and
    // strictPort so a collision fails loudly instead of Vite silently
    // shifting to the next free port. That silent shift is exactly what
    // let Electron's hardcoded dev URL (see electron/main.js) load a
    // completely different app once, undetected, since wait-on only checks
    // that *something* is listening on the port, not that it's this one.
    port: 5183,
    strictPort: true,
  },
});
