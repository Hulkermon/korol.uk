import { defineEventHandler, readBody } from 'h3'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import yaml from 'js-yaml' // Using js-yaml for reliable front matter generation

// Helper function to ensure the target directory exists
async function ensureDirExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { postContent, comments } = body

  if (!postContent || typeof postContent !== 'string' || !Array.isArray(comments)) {
    return { error: 'Invalid data provided for saving post.' }
  }

  // Generate a unique slug (e.g., using timestamp + random bytes)
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const slug = `${timestamp}-${randomSuffix}`;

  const createdAt = new Date(timestamp).toISOString();

  // Prepare front matter data
  const frontMatter = {
    postContent,
    comments, // Store the full comments/replies array
    createdAt,
    // Add title later if needed: title: 'Optional Title'
  };

  // Format as YAML front matter
  // Using --- separators is standard for Markdown front matter
  const fileContent = `---
${yaml.dump(frontMatter)}
---

<!-- Content body can be empty or contain the postContent again if desired -->
`;

  const contentDir = path.resolve(process.cwd(), 'content', 'amn_posts');
  const filePath = path.join(contentDir, `${slug}.md`);

  try {
    await ensureDirExists(contentDir);
    await fs.writeFile(filePath, fileContent, 'utf-8');

    // Return the slug, which corresponds to the path defined in content.config.ts
    return { slug: slug, path: `/ask-me-nothing/saved/${slug}` };

  } catch (error: any) {
    console.error('Error saving post to file:', error);
    return { error: 'Failed to save post due to an internal error.' };
  }
})
