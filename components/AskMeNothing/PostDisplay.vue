<template>
  <div class="post-display p-4 border rounded shadow-md bg-white">
    <div class="post-header mb-4 pb-2 border-b">
      <span class="text-sm text-gray-500">Posted by Anonymous</span>
      <!-- Add timestamp later if needed -->
    </div>
    <div class="post-content mb-6">
      <p class="whitespace-pre-wrap">{{ postContent }}</p>
    </div>
    <div class="comments-section">
      <h3 class="text-lg font-semibold mb-4">Comments</h3>
      <!-- Render comments using CommentThread -->
      <div v-if="comments.length > 0">
        <CommentThread
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          @reply-submitted="handleReplySubmit"
        />
      </div>
      <!-- Show message if no comments yet -->
      <div v-else class="text-gray-500 italic">
        No comments yet. Generating...
      </div>
    </div>
     <div class="actions mt-6 pt-4 border-t">
        <button
          @click="$emit('save-share')"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
          data-testid="save-share-button"
        >
          Save & Share
        </button>
         <!-- Display URL after saving -->
         <span v-if="shareUrl" class="text-sm text-blue-600" data-testid="share-url">
           Shareable Link: <a :href="shareUrl" target="_blank" class="underline">{{ shareUrl }}</a>
         </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'
// Import Comment type and CommentThread component
import type { Comment } from '@/types/askMeNothing'
import CommentThread from './CommentThread.vue'

// Define props
const props = defineProps({
  postContent: {
    type: String,
    required: true,
  },
  comments: {
    type: Array as PropType<Comment[]>, // Use the correct type
    required: true,
    default: () => [],
  },
   shareUrl: {
    type: String,
    default: '',
  }
})

// Define emits
const emit = defineEmits(['save-share', 'reply-submitted'])

// Function to handle replies submitted from CommentThread
const handleReplySubmit = (replyData: { commentId: string; replyText: string }) => {
  // Pass the event up to the parent page component
  emit('reply-submitted', replyData)
}
</script>
