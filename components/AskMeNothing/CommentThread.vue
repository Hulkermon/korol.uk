<template>
  <div class="comment-thread border-l-2 border-gray-200 pl-4 mb-4">
    <!-- Main Comment -->
    <div class="comment mb-3 p-3 bg-gray-50 rounded">
      <div class="comment-header text-xs text-gray-600 mb-1">
        <span>{{ comment.author }}</span> -
        <span :title="new Date(comment.timestamp).toLocaleString()">{{ timeAgo(comment.timestamp) }}</span>
      </div>
      <div class="comment-body">
        <p class="whitespace-pre-wrap">{{ comment.text }}</p>
      </div>
      <!-- Reply Action -->
      <div class="comment-actions mt-2">
        <button @click="showReplyInput = !showReplyInput" class="text-xs text-blue-600 hover:underline">
          {{ showReplyInput ? 'Cancel Reply' : 'Reply' }}
        </button>
      </div>
    </div>

    <!-- User Reply Input -->
    <div v-if="showReplyInput" class="reply-input ml-4 mb-3">
      <textarea
        v-model="replyText"
        placeholder="Write your reply..."
        rows="2"
        class="w-full p-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        data-testid="reply-textarea"
      ></textarea>
      <button
        @click="submitReply"
        :disabled="!replyText.trim()"
        class="mt-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-400"
        data-testid="submit-reply-button"
      >
        Submit Reply
      </button>
    </div>

    <!-- Replies -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies ml-4 border-l-2 border-gray-300 pl-4">
       <div v-for="reply in comment.replies" :key="reply.id" class="reply mb-2 p-2 bg-gray-100 rounded text-sm">
         <div class="reply-header text-xs text-gray-500 mb-1">
           <span>{{ reply.author }}</span> -
           <span :title="new Date(reply.timestamp).toLocaleString()">{{ timeAgo(reply.timestamp) }}</span>
         </div>
         <div class="reply-body">
           <p class="whitespace-pre-wrap">{{ reply.text }}</p>
         </div>
         <!-- Can add nested replies later if needed -->
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'
import type { Comment } from '@/types/askMeNothing'
import { timeAgo } from '@/utils/timeFormat' // Assuming a utility function exists

const props = defineProps({
  comment: {
    type: Object as PropType<Comment>,
    required: true,
  },
})

const emit = defineEmits(['reply-submitted'])

const showReplyInput = ref(false)
const replyText = ref('')

const submitReply = () => {
  if (!replyText.value.trim()) return

  emit('reply-submitted', {
    commentId: props.comment.id,
    replyText: replyText.value,
  })

  // Reset form
  replyText.value = ''
  showReplyInput.value = false
}
</script>
