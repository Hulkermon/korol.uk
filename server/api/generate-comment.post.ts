import { defineEventHandler, readBody } from 'h3';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Define a simple type for comments for validation within this file
interface SimpleComment {
  text: string;
  author: string; // Expecting 'Anonymous' or 'User'
  // Add other relevant fields if needed for context, e.g., timestamp
}
// Removed duplicate: import path from 'path'

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Safety settings to configure what content is blocked.
// Adjust these based on your application's needs.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // Add existingComments to the destructured body
  const { postContent, apiKey: apiKeyFromRequest, existingComments } = body;

  // Determine the API key to use: prioritize request, fallback to env
  const apiKeyToUse = apiKeyFromRequest || process.env.GEMINI_API_KEY;

  if (!apiKeyToUse) {
     console.error("Gemini API Key not provided in request or .env file.");
     // Return an error response instead of throwing, as this is expected if user needs to provide key
     return { error: "API Key is missing. Please provide a valid Gemini API Key." };
  }

  if (!postContent || typeof postContent !== 'string') {
    return { error: 'Invalid post content provided.' };
  }

  // Validate existingComments (optional, but good practice)
  const isValidCommentArray = (comments: any): comments is SimpleComment[] =>
    Array.isArray(comments) &&
    comments.every(
      (comment) =>
        typeof comment === 'object' &&
        comment !== null &&
        typeof comment.text === 'string' &&
        typeof comment.author === 'string'
    );

  let existingCommentsString = '';
  if (existingComments && isValidCommentArray(existingComments) && existingComments.length > 0) {
    existingCommentsString = `Here are the comments already posted on this thread:\n\n${existingComments
      .map((c) => `${c.author}: ${c.text}`)
      .join('\n')}\n`;
  }

  // Initialize the Google Generative AI client with the determined key
  const genAI = new GoogleGenerativeAI(apiKeyToUse);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Or choose another model

  // Construct the prompt for Gemini
  const prompt = `
    You are simulating a helpful and experienced Reddit user commenting on a post in a subreddit similar to r/AskReddit, where users ask for life advice. Your goal is to contribute a unique and thoughtful perspective to the ongoing discussion.
    ---
    The original user posted the following question/situation:

    ${postContent}
    ---
    ${existingCommentsString}
    ---
    **Instructions:**
    - Generate a *new*, thoughtful comment reacting to the original user's post, taking the existing comments into account.
    - Your persona should be that of a regular person sharing wisdom or perspective based on simulated life experience.
    - Your comment should be between 3 and 15 sentences long, but ensure your thought is complete (avoid getting cut off).
    - Aim to be helpful and generally uplifting, but be honest and offer critical perspectives or alternative views if appropriate. Lighthearted humor is okay if it fits.
    - **Crucially, read the existing comments (if any) and offer a distinct viewpoint or build upon them. Do NOT simply repeat advice already given.** You can reference the existing discussion (e.g., "Adding to what others said...", "I disagree with the focus on X...").
    - Try to generate content that is not the same length as other comments, to avoid redundancy.
    - Offer advice, share a relevant (simulated) anecdote, provide an alternative viewpoint, or ask a clarifying question if the original post is vague and hasn't been clarified yet.
    - Generate a username for yourself fitting the reddit vibe, it may be a bit quirky, funny and also slightly vulgar.
    - **Crucial: Reply format: { "text": "<comment>", "author": "<username>" }**
    - **Crucial: Do not include any other text or formatting. Just the JSON object.**
  `

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // Configure generation parameters if needed (temperature, max output tokens, etc.)
        // temperature: 0.7,
        maxOutputTokens: 300,
      },
      safetySettings,
    });

    // Check for safety blocks or missing response
    if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
       const blockReason = result.response?.promptFeedback?.blockReason;
       console.error('Gemini response blocked or empty. Reason:', blockReason || 'Unknown');
       return { error: `Content generation failed. ${blockReason ? `Reason: ${blockReason}` : ''}` };
    }

    const commentText = result.response.text(); // Use .text() helper

    return { comment: commentText.trim() }

  } catch (error: any) {
    console.error('Error calling Gemini API:', error)
    // Provide a more generic error to the client
    return { error: 'Failed to generate comment due to an internal error.' }
  }
})
