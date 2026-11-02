import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { localAdminPlugin } from './admin/dev-admin-plugin.mjs';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/'),
    }),
  ],
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [localAdminPlugin()],
  },
});