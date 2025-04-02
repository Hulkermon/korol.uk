<template>
  <div class="saved-post-page container mx-auto p-4">
    <!-- Correctly closed NuxtLink -->
    <NuxtLink to="/ask-me-nothing" class="text-blue-600 hover:underline mb-4 inline-block">< Back to Create New Post</NuxtLink>

    <div v-if="pending" class="text-center text-gray-500">Loading post...</div>
    <div v-else-if="error || !postData" class="text-center text-red-500">
      Error loading post: {{ error?.message || 'Post not found.' }}
    </div>
    <AskMeNothingPostDisplay
      v-else
      :post-content="postData.postContent"
      :comments="postData.comments"
      :share-url="currentPath"
      @reply-submitted="handleReplySubmitOnSavedPost"
      data-testid="post-display-wrapper"
    />
    <p v-if="replyError" class="text-red-500 text-sm mt-2 text-center">Error generating reply: {{ replyError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Import Nuxt composables (rely on auto-import for queryContent)
import { useRoute, useAsyncData } from '#imports';
// Import local components and types
import AskMeNothingPostDisplay from '@/components/AskMeNothing/PostDisplay.vue';
import type { Comment, Reply } from '@/types/askMeNothing';

// Define expected structure of fetched post data
interface SavedPost {
  _path: string;
  postContent: string;
  comments: Comment[];
  createdAt: string;
  title?: string;
  [key: string]: any;
}

// Define expected API response type for reply generation
interface GenerateReplySuccessResponse {
  reply: string; error?: never;
}
interface GenerateReplyErrorResponse {
  reply?: never; error: string;
}
type GenerateReplyResponse = GenerateReplySuccessResponse | GenerateReplyErrorResponse;


const route = useRoute();
const slug = route.params.slug as string;
const currentPath = route.fullPath;

const replyError = ref<string | null>(null);
const isLoadingReply = ref<Record<string, boolean>>({});

// Fetch the content for the specific slug using auto-imported queryContent
const { data: postData, pending, error } = await useAsyncData<SavedPost>(
  `amn-post-${slug}`,
  // @ts-ignore - Temporarily ignore TS error assuming queryContent is globally available at runtime
  () => queryContent<SavedPost>('/amn_posts', slug).findOne()
);

// Ensure comments array exists after loading
if (postData.value && !Array.isArray(postData.value.comments)) {
    console.warn('Loaded post data comments is not an array, resetting.');
    postData.value.comments = [];
}

// --- Reply Handling for Saved Posts ---
const handleReplySubmitOnSavedPost = async (replyData: { commentId: string; replyText: string }) => {
  if (!postData.value) {
      replyError.value = "Post data is not available.";
      return;
  }

  replyError.value = null;
  const { commentId, replyText } = replyData;

  if (!commentId) {
      replyError.value = "Invalid comment ID received.";
      return;
  }

  const targetCommentIndex = postData.value.comments.findIndex(c => c.id === commentId);
  if (targetCommentIndex === -1) {
    replyError.value = "Could not find the comment to reply to.";
    return;
  }
  const targetComment = postData.value.comments[targetCommentIndex];

  // Add user reply
  const userReply: Reply = {
    id: `reply-user-${Date.now()}-${Math.random()}`,
    text: replyText, author: 'User', timestamp: Date.now(),
  };
  if (!Array.isArray(targetComment.replies)) {
    postData.value.comments[targetCommentIndex].replies = [];
  }
  postData.value.comments[targetCommentIndex].replies.push(userReply);

  isLoadingReply.value[commentId] = true;
  try {
    // Still assuming API key is handled server-side or globally
    const response = await $fetch<GenerateReplyResponse>('/api/generate-reply', {
      method: 'POST',
      body: {
        originalPost: postData.value.postContent,
        commentText: targetComment.text,
        userReplyText: replyText,
      }
    });

    if (response.error) throw new Error(response.error);

    if (response.reply) {
      setTimeout(() => {
        if (!postData.value) return; // Re-check postData

        const aiReply: Reply = {
          id: `reply-ai-${Date.now()}-${Math.random()}`,
          text: response.reply, author: 'Anonymous', timestamp: Date.now(),
        };
        // Re-find comment index as data might change or component unmounted
        const currentTargetCommentIndex = postData.value?.comments.findIndex(c => c.id === commentId);
        if (currentTargetCommentIndex !== -1 && postData.value) { // Check postData again
           if (!Array.isArray(postData.value.comments[currentTargetCommentIndex].replies)) {
               postData.value.comments[currentTargetCommentIndex].replies = [];
           }
           postData.value.comments[currentTargetCommentIndex].replies.push(aiReply);
        } else {
             console.warn(`Comment ${commentId} disappeared before AI reply could be added.`);
        }
        delete isLoadingReply.value[commentId]; // Use delete, safe if key doesn't exist
      }, 30000);
    } else {
      console.warn('Received empty reply from API');
      delete isLoadingReply.value[commentId];
    }
  } catch (err: any) {
    console.error('Failed to generate reply on saved post:', err);
    replyError.value = err.message || 'Error generating reply.';
    delete isLoadingReply.value[commentId];
  }
};

</script>
