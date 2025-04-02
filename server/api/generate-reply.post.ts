import { defineEventHandler, readBody } from 'h3'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { originalPost, commentText, userReplyText, apiKey: apiKeyFromRequest } = body

  // Determine the API key to use: prioritize request, fallback to env
  const apiKeyToUse = apiKeyFromRequest || process.env.GEMINI_API_KEY;

  if (!apiKeyToUse) {
     console.error("Gemini API Key not provided in request or .env file for reply generation.");
     return { error: "API Key is missing. Please provide a valid Gemini API Key." };
  }

  if (!originalPost || typeof originalPost !== 'string' ||
      !commentText || typeof commentText !== 'string' ||
      !userReplyText || typeof userReplyText !== 'string') {
    return { error: 'Invalid input provided for reply generation.' }
  }

   // Initialize the Google Generative AI client with the determined key
  const genAI = new GoogleGenerativeAI(apiKeyToUse);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Construct the prompt for Gemini to generate a reply
  const prompt = `You are simulating a helpful and experienced Reddit user replying to another user within a comment thread on a subreddit similar to r/AskReddit, where users ask for life advice.

  The original post (the life advice question) was:
  ---
  ${originalPost}
  ---

  The specific comment you originally made (as 'Anonymous') is:
  ---
  ${commentText}
  ---

  The user ('User') has now replied to your comment with:
  ---
  ${userReplyText}
  ---

  Generate a single, thoughtful reply (up to 10 sentences) reacting to the 'User's reply, continuing the conversation from the perspective of 'Anonymous' (the original commenter). Maintain a helpful and generally uplifting tone, but remain honest. You can elaborate on your previous point, acknowledge the user's reply, offer further simulated experience/wisdom, gently present an alternative view, or use appropriate humor.
  
  Do NOT include a username or signature. Just provide the reply text.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 200,
      },
      safetySettings,
    });

     if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
       const blockReason = result.response?.promptFeedback?.blockReason;
       console.error('Gemini reply response blocked or empty. Reason:', blockReason || 'Unknown');
       return { error: `Content generation failed. ${blockReason ? `Reason: ${blockReason}` : ''}` };
    }

    const replyText = result.response.text();

    return { reply: replyText.trim() }

  } catch (error: any) {
    console.error('Error calling Gemini API for reply:', error)
    return { error: 'Failed to generate reply due to an internal error.' }
  }
})
