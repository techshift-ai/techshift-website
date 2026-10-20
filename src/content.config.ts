import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seo = z.object({
  title: z.string().max(60, 'Keep titles under 60 characters'),
  description: z.string().min(50).max(160, 'Keep descriptions under 160 characters'),
  ogImage: z.string().optional(),
  noindex: z.boolean().default(false),
});

const faq = z.array(z.object({ question: z.string(), answer: z.string() })).default([]);

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    seo,
    faq,
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    heading: z.string(),
    draft: z.boolean().default(false),
    updated: z.coerce.date().optional(),
    seo,
  }),
});

export const collections = { services, pages };
