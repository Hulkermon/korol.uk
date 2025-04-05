<template>
  <div class="guestbook-container border-4 border-double border-purple-600 p-4 my-8 bg-gradient-to-br from-yellow-200 via-pink-300 to-blue-300 shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
    <h2 class="text-3xl font-bold text-center mb-6 text-red-600 animate-pulse">
      <span class="blink">~*~</span> Sign My Guestbook! <span class="blink">~*~</span>
    </h2>

    <!-- Submission Form -->
    <form @submit.prevent="submitEntry" class="mb-8 p-4 border-2 border-dashed border-green-500 bg-white bg-opacity-80">
      <div class="mb-4">
        <label for="guestName" class="block text-lg font-semibold text-blue-700 mb-1">Your Name:</label>
        <input
          type="text"
          id="guestName"
          v-model="form.name"
          required
          class="w-full p-2 border-2 border-black focus:outline-none focus:border-pink-500 font-['Comic_Sans_MS']"
          placeholder="Cool Surfer Dude"
        />
      </div>
      <div class="mb-4">
        <label for="guestMessage" class="block text-lg font-semibold text-blue-700 mb-1">Leave a Message:</label>
        <textarea
          id="guestMessage"
          v-model="form.message"
          required
          rows="4"
          class="w-full p-2 border-2 border-black focus:outline-none focus:border-pink-500 font-['Comic_Sans_MS']"
          placeholder="Totally radical website, man!"
        ></textarea>
      </div>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full py-2 px-4 bg-gradient-to-r from-lime-400 to-green-500 text-white font-bold text-xl border-2 border-outset border-black hover:from-green-500 hover:to-lime-400 active:border-inset disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isSubmitting ? 'Submitting...' : 'Sign Now!' }}
      </button>
      <p v-if="submitStatus.message" :class="['mt-3 text-center font-bold', submitStatus.isError ? 'text-red-700' : 'text-green-700']">
        {{ submitStatus.message }}
      </p>
    </form>

    <!-- Display Entries -->
    <div class="entries-section">
      <h3 class="text-2xl font-semibold text-center mb-4 text-purple-800">~*~ Previous Entries ~*~</h3>
      <div v-if="pending" class="text-center text-gray-600">Loading entries... <span class="animate-spin">⏳</span></div>
      <div v-else-if="error" class="text-center text-red-600 font-bold">Error loading entries: {{ error.message }}</div>
      <div v-else-if="entries && entries.length > 0" class="space-y-4">
        <div v-for="entry in entries" :key="entry._path" class="entry p-3 border border-gray-400 bg-white bg-opacity-70 shadow-md">
          <p class="font-bold text-indigo-700">{{ entry.name }} <span class="text-sm text-gray-500 font-normal">wrote on {{ formatDate(entry.timestamp) }}:</span></p>
          <p class="mt-1 text-gray-800">{{ entry.message }}</p>
        </div>
      </div>
      <div v-else class="text-center text-gray-500 italic">Be the first to sign!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { queryCollection } from '#imports'; // Auto-imported by Nuxt

// Form state
const form = reactive({
  name: '',
  message: '',
});
const isSubmitting = ref(false);
const submitStatus = reactive({ message: '', isError: false });

// Fetch guestbook entries
const { data: entries, pending, error, refresh } = await useAsyncData(
  'guestbookEntries',
  () => queryCollection('guestbook').order('timestamp', 'desc').all(), // Use .order('field', 'desc') for sorting in Nuxt Content v3.
  { server: false } // Re-added: Fetch on client-side only to avoid server-side query error
);

// Form submission handler
async function submitEntry() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  submitStatus.message = '';
  submitStatus.isError = false;

  try {
    const response = await $fetch('/api/guestbook', {
      method: 'POST',
      body: {
        name: form.name,
        message: form.message,
      },
    });

    if (response.success) {
      submitStatus.message = 'Yeehaw! Entry submitted!';
      form.name = '';
      form.message = '';
      await refresh(); // Refresh the entries list
      setTimeout(() => submitStatus.message = '', 3000); // Clear message after 3s
    } else {
      throw new Error(response.error || 'Unknown error');
    }
  } catch (err: any) {
    console.error('Submission error:', err);
    submitStatus.message = `Whoops! Error: ${err.data?.error || err.message || 'Could not submit entry.'}`;
    submitStatus.isError = true;
  } finally {
    isSubmitting.value = false;
  }
}

// Helper to format timestamp
function formatDate(isoString: string): string {
  if (!isoString) return 'unknown date';
  try {
    return new Date(isoString).toLocaleString();
  } catch (e) {
    return 'invalid date';
  }
}
</script>

<style scoped>
/* Add blink animation if not globally defined */
@keyframes blinker {
  50% {
    opacity: 0;
  }
}
.blink {
  animation: blinker 1s linear infinite;
}

/* Basic Comic Sans MS font application */
.guestbook-container {
  font-family: 'Comic Sans MS', cursive, sans-serif;
}

/* Add more specific Y2K styles if needed */
input, textarea {
  box-shadow: 2px 2px 0px #aaa;
}
button {
   text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
}
</style>
