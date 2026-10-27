import { defineConfig } from 'astro/config';
import { localAdminPlugin } from './admin/dev-admin-plugin.mjs';

export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [localAdminPlugin()],
  },
});