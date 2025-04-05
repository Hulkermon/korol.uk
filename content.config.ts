import { defineContentConfig, defineCollection, z } from '@nuxt/content';

export default defineContentConfig({
  collections: {
    // content: defineCollection({
    //   type: 'page',
    //   source: '**/*.md',
    // }),
    guestbook: defineCollection({
      type: 'page', // Treat each entry as a page
      source: 'guestbook/*.md', // Source files from content/guestbook/
      schema: z.object({
        name: z.string(),
        message: z.string(),
        timestamp: z.string().datetime(), // Expect ISO string
      }),
    }),
  },
});
