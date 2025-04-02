<template>
  <div class="api-key-prompt fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded shadow-lg max-w-md w-full">
      <h2 class="text-xl font-semibold mb-4">Gemini API Key Required</h2>
      <p class="text-gray-700 mb-4">
        To generate AI comments and replies, please provide your Google Gemini API key.
        You can obtain one from Google AI Studio. This key will only be used in your browser session and not stored permanently unless you save the post.
      </p>
      <div class="mb-4">
        <label for="apiKeyInput" class="block text-sm font-medium text-gray-700 mb-1">API Key:</label>
        <input
          id="apiKeyInput"
          type="password"
          v-model="enteredKey"
          placeholder="Enter your Gemini API Key"
          class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="api-key-input"
        />
      </div>
      <button
        @click="submitKey"
        :disabled="!enteredKey.trim()"
        class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        data-testid="submit-api-key-button"
      >
        Submit Key
      </button>
       <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const enteredKey = ref('')
const error = ref('') // Basic error display if needed

const emit = defineEmits(['submit-key'])

const submitKey = () => {
  error.value = ''
  if (!enteredKey.value.trim()) {
    error.value = 'API Key cannot be empty.'
    return
  }
  // Basic validation (just checks if it's not empty)
  // A real app might try a quick test call here
  emit('submit-key', enteredKey.value)
}
</script>
