import { defineEventHandler, readBody } from 'h3'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
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
  const prompt = `You are simulating a Reddit user replying to another user within a comment thread on an "Ask Me Anything" (AMA) style post on a parody subreddit called r/AskMeNothing.

The original post was:
---
${originalPost}
---

The comment being replied to is:
---
${commentText}
---

The user's reply to that comment is:
---
${userReplyText}
---

Generate a single, concise reply (max 2-3 sentences) from the perspective of the original commenter (Anonymous) reacting to the user's reply. The reply should sound like a typical Reddit reply - it could be funny, quirky, insightful, defensive, agreeable, or ask another question. Do NOT include a username or signature. Just provide the reply text.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 100,
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
