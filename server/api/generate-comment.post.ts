import { defineEventHandler, readBody } from 'h3'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Safety settings to configure what content is blocked.
// Adjust these based on your application's needs.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { postContent, apiKey: apiKeyFromRequest } = body

  // Determine the API key to use: prioritize request, fallback to env
  const apiKeyToUse = apiKeyFromRequest || process.env.GEMINI_API_KEY;

  if (!apiKeyToUse) {
     console.error("Gemini API Key not provided in request or .env file.");
     // Return an error response instead of throwing, as this is expected if user needs to provide key
     return { error: "API Key is missing. Please provide a valid Gemini API Key." };
  }

  if (!postContent || typeof postContent !== 'string') {
    return { error: 'Invalid post content provided.' }
  }

  // Initialize the Google Generative AI client with the determined key
  const genAI = new GoogleGenerativeAI(apiKeyToUse);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Or choose another model

  // Construct the prompt for Gemini
  const prompt = `You are simulating a Reddit user commenting on an "Ask Me Anything" (AMA) style post on a parody subreddit called r/AskMeNothing.
The user shared the following:
---
${postContent}
---
Generate a single, concise comment (max 2-3 sentences) reacting to the user's post. The comment should sound like a typical Reddit comment - it could be funny, quirky, insightful, supportive, slightly off-topic, or ask a follow-up question. Do NOT include a username or signature. Just provide the comment text.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // Configure generation parameters if needed (temperature, max output tokens, etc.)
        // temperature: 0.7,
        maxOutputTokens: 100,
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
