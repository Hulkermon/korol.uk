import { defineContentConfig, defineCollection } from '@nuxt/content';

// Define a collection for the Ask Me Nothing posts
import { z } from 'zod'; // Import zod for schema definition

// Define a collection for the Ask Me Nothing posts
const amnPosts = defineCollection({
  type: 'page', // Use 'page' type
  // title: 'Ask Me Nothing Posts', // Remove: Not a valid config property
  // description: 'Saved posts from the Ask Me Nothing page', // Remove: Not a valid config property
  // dir: 'content/amn_posts', // Remove: Inferred from collection key
  // path: '/ask-me-nothing/saved/:slug', // Remove: Routing handled by pages directory
  // format: 'md', // Remove: Default format for 'page' type is likely markdown
  schema: z.object({ // Define expected front matter structure using zod
    title: z.string().optional(), // Optional title - can be used if needed, e.g., for browser tab
    postContent: z.string(),
    // Define comments more specifically if possible, or use z.any() for flexibility
    comments: z.array(z.any()), // Store comments/replies as JSON array
    createdAt: z.string().datetime(), // Expect an ISO date string
    // Add any other fields you might want to store
  }).passthrough(), // Allow other fields not explicitly defined
});

export default defineContentConfig({
  collections: {
    // Keep the existing 'content' collection if it's used elsewhere
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
    }),
    // Add the new collection
    amn_posts: amnPosts,
  },
});
