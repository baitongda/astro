import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const sitemapUrl = new URL('sitemap-index.xml', base);

  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${sitemapUrl.href}\n`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
};