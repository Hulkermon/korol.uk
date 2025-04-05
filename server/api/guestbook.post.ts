import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Basic validation
    if (
      !body ||
      typeof body.name !== 'string' ||
      typeof body.message !== 'string' ||
      body.name.trim() === '' ||
      body.message.trim() === ''
    ) {
      setResponseStatus(event, 400); // Bad Request
      return { success: false, error: 'Name and message are required.' };
    }

    const name = body.name.trim();
    const message = body.message.trim();
    const timestamp = new Date().toISOString();
    const filename = `entry-${Date.now()}.md`;
    const directoryPath = resolve(process.cwd(), 'content/guestbook'); // Use process.cwd() for root
    const filePath = resolve(directoryPath, filename);

    // Ensure the directory exists
    await mkdir(directoryPath, { recursive: true });

    // Prepare Markdown content with frontmatter
    // prettier-ignore no like really.. format matter here big time
    const fileContent = `---
name: ${JSON.stringify(name)}
message: ${JSON.stringify(message)}
timestamp: ${timestamp}
---
${message}
    `; // Add message body below frontmatter as well, though not strictly needed by schema

    // Write the file
    await writeFile(filePath, fileContent, 'utf-8');

    setResponseStatus(event, 201); // Created
    return { success: true };
  } catch (error) {
    console.error('Error saving guestbook entry:', error);
    setResponseStatus(event, 500); // Internal Server Error
    return { success: false, error: 'Failed to save guestbook entry.' };
  }
});
