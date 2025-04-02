<template>
  <div class="create-post-form p-4 border rounded shadow-md bg-white">
    <h2 class="text-xl font-semibold mb-4">Create New Post</h2>
    <textarea
      v-model="postContent"
      placeholder="Share your story, experience, or anything interesting..."
      class="w-full h-40 p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      data-testid="post-textarea"
    ></textarea>
    <button
      @click="submitPost"
      :disabled="!postContent.trim()"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      data-testid="submit-post-button"
    >
      Post Anonymously
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const postContent = ref('')
const emit = defineEmits(['submit-post'])

const submitPost = () => {
  if (postContent.value.trim()) {
    emit('submit-post', postContent.value)
    // Optionally clear the textarea after submit
    // postContent.value = ''
  }
}
</script>
