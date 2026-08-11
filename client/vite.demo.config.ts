import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds a single, self-contained index.html that runs entirely client-side
// (localStorage instead of the Express/SQLite server — see src/localApi.ts).
// Meant to be opened directly via file:// or dropped anywhere as one file,
// with nothing to install and no server to run.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
