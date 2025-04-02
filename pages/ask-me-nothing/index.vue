<template>
  <div class="ask-me-nothing-page container mx-auto p-4">
    <h1 class="text-3xl font-bold text-center mb-6 text-orange-600">r/AskMeNothing</h1>

    <!-- API Key Prompt -->
    <AskMeNothingApiKeyPrompt v-if="showApiKeyPrompt" @submit-key="handleApiKeySubmit" data-testid="api-key-prompt"/>

    <!-- Create Post Form -->
    <AskMeNothingCreatePostForm
      v-if="!postSubmitted"
      @submit-post="handlePostSubmit"
      data-testid="create-post-form-wrapper"
    />

    <!-- Post Display -->
    <AskMeNothingPostDisplay
      v-else
      :post-content="submittedPostContent"
      :comments="comments"
      :share-url="shareUrl"
      @save-share="handleSaveShare"
      @reply-submitted="handleReplySubmit"
      data-testid="post-display-wrapper"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue' // Add onMounted
// Import components using the alias Nuxt provides
import AskMeNothingCreatePostForm from '@/components/AskMeNothing/CreatePostForm.vue'
import AskMeNothingPostDisplay from '@/components/AskMeNothing/PostDisplay.vue'
import AskMeNothingApiKeyPrompt from '@/components/AskMeNothing/ApiKeyPrompt.vue' // Import ApiKeyPrompt
// Import types
import type { Comment, Reply } from '@/types/askMeNothing';

// Define expected API response types
interface GenerateCommentSuccessResponse {
  comment: string;
  error?: never; // Ensure error is not present on success
}
interface GenerateCommentErrorResponse {
  comment?: never; // Ensure comment is not present on error
  error: string;
}
type GenerateCommentResponse = GenerateCommentSuccessResponse | GenerateCommentErrorResponse;

interface GenerateReplySuccessResponse {
  reply: string;
  error?: never;
}
interface GenerateReplyErrorResponse {
  reply?: never;
  error: string;
}
type GenerateReplyResponse = GenerateReplySuccessResponse | GenerateReplyErrorResponse;


const postSubmitted = ref(false)
const submittedPostContent = ref('')
const comments = ref<Comment[]>([]) // Use the Comment type
const shareUrl = ref('')
const isLoadingComment = ref(false)
const commentError = ref<string | null>(null)
const replyError = ref<string | null>(null)
const saveError = ref<string | null>(null) // Add error state for saving
const isLoadingSave = ref(false) // Add loading state for saving
const isLoadingReply = ref<Record<string, boolean>>({})
let commentIntervalId: ReturnType<typeof setInterval> | null = null;
let generatedCommentCount = 0;
const MAX_COMMENTS = 10;
const COMMENT_INTERVAL_MS = 60 * 1000; // 60 seconds
const REPLY_DELAY_MS = 30 * 1000; // 30 seconds

// API Key State
const apiKey = ref<string | null>(null) // Store the API key
const showApiKeyPrompt = ref(false)

const handlePostSubmit = (content: string) => {
  // Ensure API key exists before allowing post submission
  if (!apiKey.value) {
     showApiKeyPrompt.value = true;
     // Optionally show an error message
     console.error("API Key is required to post.");
     return;
  }
  submittedPostContent.value = content
  postSubmitted.value = true
  // Trigger AI comment generation here later
  startCommentGeneration() // Placeholder call
}

// --- AI Comment Generation ---

const generateSingleComment = async () => {
  if (generatedCommentCount >= MAX_COMMENTS) {
    stopCommentGeneration(); // Stop if max reached
    return;
  }

  isLoadingComment.value = true;
  commentError.value = null;

  try {
    // Use $fetch provided by Nuxt, specifying the expected response type
    const response = await $fetch<GenerateCommentResponse>('/api/generate-comment', {
      method: 'POST',
      body: {
        postContent: submittedPostContent.value,
        apiKey: apiKey.value // Pass the API key
      }
    });

    // Check if the response indicates an error
    if (response.error) {
      throw new Error(response.error);
    }

    // If no error, we expect a comment
    if (response.comment) {
      const newComment: Comment = {
        id: `comment-${Date.now()}-${Math.random()}`, // Simple unique ID
        text: response.comment,
        author: 'Anonymous',
        timestamp: Date.now(),
        replies: []
      };
      comments.value.push(newComment);
      generatedCommentCount++;
    } else {
       console.warn('Received empty comment from API');
       // Optionally handle this case, maybe retry or just skip
    }

  } catch (error: any) {
    console.error('Failed to generate comment:', error);
    // More robust error message handling
    commentError.value = error?.message || (typeof error === 'string' ? error : 'An unknown error occurred during comment generation.');
    // Optionally stop generation on error, or allow retries
    // stopCommentGeneration();
  } finally {
    isLoadingComment.value = false;
    if (generatedCommentCount >= MAX_COMMENTS) {
      stopCommentGeneration(); // Stop if max reached after this generation
    }
  }
};

const startCommentGeneration = () => {
  stopCommentGeneration(); // Clear any existing interval first
  generatedCommentCount = 0; // Reset count
  comments.value = []; // Clear previous comments if any
  console.log('Starting AI comment generation...');

  // Generate the first comment immediately
  generateSingleComment();

  // Then set interval for subsequent comments
  commentIntervalId = setInterval(generateSingleComment, COMMENT_INTERVAL_MS);
};

const stopCommentGeneration = () => {
  if (commentIntervalId) {
    clearInterval(commentIntervalId);
    commentIntervalId = null;
    console.log('Stopped AI comment generation.');
  }
};

// Clear interval when the component is unmounted
onUnmounted(() => {
  stopCommentGeneration();
});

// --- User Replies ---
const handleReplySubmit = async (replyData: { commentId: string; replyText: string }) => {
  replyError.value = null; // Clear previous reply errors
  const { commentId, replyText } = replyData;

  // 1. Find the target comment
  const targetCommentIndex = comments.value.findIndex(c => c.id === commentId);
  if (targetCommentIndex === -1) {
    console.error(`Comment with ID ${commentId} not found.`);
    replyError.value = "Could not find the comment to reply to.";
    return;
  }
  const targetComment = comments.value[targetCommentIndex];

  // 2. Add the user's reply immediately
  const userReply: Reply = {
    id: `reply-user-${Date.now()}-${Math.random()}`,
    text: replyText,
    author: 'User',
    timestamp: Date.now(),
  };
  // Ensure replies array exists
  if (!Array.isArray(targetComment.replies)) {
      comments.value[targetCommentIndex].replies = [];
  }
  comments.value[targetCommentIndex].replies.push(userReply);

  // 3. Trigger AI reply generation (call API)
  isLoadingReply.value[commentId] = true; // Set loading state for this comment thread
  try {
    const response = await $fetch<GenerateReplyResponse>('/api/generate-reply', {
      method: 'POST',
      body: {
        originalPost: submittedPostContent.value,
        commentText: targetComment.text,
        userReplyText: replyText,
        apiKey: apiKey.value // Pass the API key
      }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.reply) {
      // 4. Add AI reply after delay
      setTimeout(() => {
        const aiReply: Reply = {
          id: `reply-ai-${Date.now()}-${Math.random()}`,
          text: response.reply,
          author: 'Anonymous',
          timestamp: Date.now(),
        };
         // Find the comment again in case the array reference changed (though unlikely with ref)
         const currentTargetCommentIndex = comments.value.findIndex(c => c.id === commentId);
         if (currentTargetCommentIndex !== -1) {
            comments.value[currentTargetCommentIndex].replies.push(aiReply);
         } else {
             console.warn(`Comment ${commentId} disappeared before AI reply could be added.`);
         }
         delete isLoadingReply.value[commentId]; // Clear loading state
      }, REPLY_DELAY_MS);

    } else {
       console.warn('Received empty reply from API');
       delete isLoadingReply.value[commentId]; // Clear loading state even if reply is empty
    }

  } catch (error: any) {
    console.error('Failed to generate reply:', error);
    // More robust error message handling
    replyError.value = error?.message || (typeof error === 'string' ? error : 'An unknown error occurred during reply generation.');
    // Guard commentId usage here too
    if (commentId) delete isLoadingReply.value[commentId];
  }
  // Note: isLoadingReply is cleared inside the setTimeout for success, or in catch/finally for errors/empty replies
};


// --- Save & Share ---
interface SavePostResponse {
  slug?: string;
  path?: string;
  error?: string;
}

const handleSaveShare = async () => {
  stopCommentGeneration(); // Stop generation when saving
  isLoadingSave.value = true;
  saveError.value = null;
  console.log('Saving post...');

  try {
    const response = await $fetch<SavePostResponse>('/api/save-post', {
      method: 'POST',
      body: {
        postContent: submittedPostContent.value,
        comments: comments.value // Send the current comments array
      }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.path) {
      shareUrl.value = response.path; // Update the shareUrl with the path returned from API
      console.log('Post saved. Shareable URL:', shareUrl.value);
      // Optionally disable the save button after success?
    } else {
      throw new Error('Save API did not return a valid path.');
    }

  } catch (error: any) {
    console.error('Failed to save post:', error);
    // More robust error message handling
    saveError.value = error?.message || (typeof error === 'string' ? error : 'An unknown error occurred while saving.');
  } finally {
    isLoadingSave.value = false;
  }
};


// --- API Key Handling ---
const handleApiKeySubmit = (key: string) => {
  apiKey.value = key;
  showApiKeyPrompt.value = false;
  // Optionally trigger actions that were blocked, like submitting post if content exists
  // if (submittedPostContent.value && !postSubmitted.value) {
  //    handlePostSubmit(submittedPostContent.value); // Be careful with re-triggering
  // }
};

// Load API key from env on component mount (dev only) or show prompt
onMounted(() => {
  const config = useRuntimeConfig();
  if (config.public.geminiApiKeyDev) {
    console.log('Loading API Key from dev config');
    apiKey.value = config.public.geminiApiKeyDev;
  } else {
    // If not in dev or key not set in .env, prompt is needed
    // We might delay showing the prompt until the user tries to post
    // Or show it immediately if no key is found
    console.log('API Key not found in dev config, prompt might be needed.');
    // Show prompt immediately if no key found:
    // showApiKeyPrompt.value = true;
  }
});

</script>
