import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({
  label: z.string(),
  href: z.string(),
});

const home = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/home' }),
  schema: z.object({
    seo: z.object({
      title: z.string(),
      description: z.string(),
    }),
    announcement: z.object({
      text: z.string(),
      label: z.string(),
      href: z.string(),
    }),
    brand: z.object({
      name: z.string(),
      shortName: z.string(),
      slogan: z.string(),
    }),
    navigation: z.array(link),
    hero: z.object({
      eyebrow: z.string(),
      title: z.string(),
      subtitle: z.string(),
      description: z.string(),
      primaryCta: link,
      secondaryCta: link,
      stats: z.array(z.object({ value: z.string(), label: z.string() })),
      preview: z.object({
        title: z.string(),
        caption: z.string(),
        progressLabel: z.string(),
        progressValue: z.string(),
        metrics: z.array(z.object({ label: z.string(), value: z.string(), trend: z.string() })),
        tasks: z.array(z.object({ title: z.string(), meta: z.string(), status: z.string() })),
      }),
    }),
    painPoints: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      items: z.array(
        z.object({
          category: z.string(),
          lesson: z.string(),
          title: z.string(),
          bullets: z.array(z.string()),
        }),
      ),
    }),
    phases: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      items: z.array(
        z.object({
          index: z.string(),
          title: z.string(),
          description: z.string(),
          tags: z.array(z.string()),
        }),
      ),
    }),
    benefits: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      items: z.array(
        z.object({
          tag: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      ),
    }),
    pricing: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      badge: z.string(),
      name: z.string(),
      oldPrice: z.string(),
      price: z.string(),
      unit: z.string(),
      summary: z.string(),
      features: z.array(z.string()),
      cta: link,
      note: z.string(),
    }),
    faqs: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      items: z.array(z.object({ question: z.string(), answer: z.string() })),
    }),
    about: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      paragraphs: z.array(z.string()),
      stats: z.array(z.object({ value: z.string(), label: z.string() })),
      contacts: z.array(z.object({ label: z.string(), value: z.string(), href: z.string() })),
    }),
    footer: z.object({
      description: z.string(),
      socials: z.array(z.object({ label: z.string(), value: z.string(), href: z.string() })),
      legal: z.array(link),
      languages: z.array(z.object({ label: z.string(), href: z.string(), active: z.boolean() })),
      copyright: z.string(),
    }),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.string().default('进行中'),
    category: z.string(),
    order: z.number().default(0),
    url: z.string().optional(),
  }),
});

export const collections = { home, notes, products };