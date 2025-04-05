<template>
  <div
    class="guestbook-container border-4 border-double border-purple-600 p-4 my-8 bg-gradient-to-br from-yellow-200 via-pink-300 to-blue-300 shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
    <h2 class="text-3xl font-bold text-center mb-6 text-red-600 animate-pulse">
      <span class="blink">~*~</span> Sign My Guestbook! <span class="blink">~*~</span>
    </h2>

    <!-- Submission Form -->
    <form
      @submit.prevent="submitEntry"
      class="mb-8 p-4 border-2 border-dashed border-green-500 bg-white bg-opacity-80">
      <div class="mb-4">
        <label for="guestName" class="block text-lg font-semibold text-blue-700 mb-1"
          >Your Name:</label
        >
        <input
          type="text"
          id="guestName"
          v-model="form.name"
          required
          class="w-full p-2 border-2 border-black focus:outline-none focus:border-pink-500 font-['Comic_Sans_MS']"
          placeholder="Cool Surfer Dude" />
      </div>
      <div class="mb-4">
        <label for="guestMessage" class="block text-lg font-semibold text-blue-700 mb-1"
          >Leave a Message:</label
        >
        <textarea
          id="guestMessage"
          v-model="form.message"
          required
          rows="4"
          class="w-full p-2 border-2 border-black focus:outline-none focus:border-pink-500 font-['Comic_Sans_MS']"
          placeholder="Totally radical website, man!"></textarea>
      </div>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full py-2 px-4 bg-gradient-to-r from-lime-400 to-green-500 text-white font-bold text-xl border-2 border-outset border-black hover:from-green-500 hover:to-lime-400 active:border-inset disabled:opacity-50 disabled:cursor-not-allowed">
        {{ isSubmitting ? 'Submitting...' : 'Sign Now!' }}
      </button>
      <p
        v-if="submitStatus.message"
        :class="[
          'mt-3 text-center font-bold',
          submitStatus.isError ? 'text-red-700' : 'text-green-700',
        ]">
        {{ submitStatus.message }}
      </p>
    </form>

    <!-- Display Entries -->
    <div class="entries-section">
      <h3 class="text-2xl font-semibold text-center mb-4 text-purple-800">
        ~*~ Previous Entries ~*~
      </h3>
      <div v-if="pending" class="text-center text-gray-600">
        Loading entries... <span class="animate-spin">⏳</span>
      </div>
      <div v-else-if="error" class="text-center text-red-600 font-bold">
        Error loading entries: {{ error.message }}
      </div>
      <div v-else-if="entries && entries.length > 0" class="entries-list space-y-4 relative">
        <!-- Add relative positioning for z-index chaos -->
        <div
          v-for="(entry, index) in entries"
          :key="entry._path"
          :class="['gb-entry-window', getRandomStyleClass(index)]"
          >
          <!-- Title Bar -->
          <div class="gb-title-bar">
            <span class="font-bold text-sm pl-1">Guestbook Entry #{{ entries.length - index }}</span>
            <!-- Maybe add fake buttons based on style later if needed -->
          </div>

          <!-- Content Area - Conditional structure for icon styles -->
          <div v-if="styleRequiresIcon(getRandomStyleClass(index))" class="gb-content-wrapper">
             <div class="gb-icon">{{ getIconForStyle(getRandomStyleClass(index)) }}</div>
             <div class="gb-content">
                <p>
                  {{ entry.name }}
                  <span class="text-xs text-gray-600 font-normal"
                    >wrote on {{ formatDate(entry.timestamp) }}:</span
                  >
                </p>
                <p class="mt-1">{{ entry.message }}</p>
             </div>
          </div>
          <div v-else class="gb-content">
            <p>
              {{ entry.name }}
              <span>wrote on {{ formatDate(entry.timestamp) }}:</span>
            </p>
            <p class="mt-1">{{ entry.message }}</p>
          </div>

        </div>
      </div>
      <div v-else class="text-center text-gray-500 italic">Be the first to sign!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive } from 'vue';
  import '~/assets/css/guestbook.css';

  // Form state
  const form = reactive({
    name: '',
    message: '',
  });
  const isSubmitting = ref(false);
  const submitStatus = reactive({ message: '', isError: false });

  // Fetch guestbook entries
  const {
    data: entries,
    pending,
    error,
    refresh,
  } = await useAsyncData(
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
        setTimeout(() => (submitStatus.message = ''), 3000); // Clear message after 3s
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      submitStatus.message = `Whoops! Error: ${
        err.data?.error || err.message || 'Could not submit entry.'
      }`;
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

  // --- Random Style Selector ---
  const availableStyles = [
    'gb-style-win95',
    'gb-style-win95-error', // !
    'gb-style-mac-classic',
    'gb-style-vaporwave',
    'gb-style-generic-web1',
    'gb-style-win95-error-alt', // X
    'gb-style-mac-warning', // ! (triangle)
    'gb-style-win95-success', // ✔
    'gb-style-pastel-success', // ✔
    'gb-style-win95-info', // i
    'gb-style-aqua-info', // i
    'gb-style-vaporwave-alt'
  ];

  // Cache results per index to avoid recalculating style class multiple times per entry
  const styleCache = new Map<number, string>();

  function getRandomStyleClass(index: number): string {
    if (styleCache.has(index)) {
      return styleCache.get(index)!;
    }
    // Use modulo to cycle through the available styles based on index
    const styleClass = availableStyles[index % availableStyles.length];
    styleCache.set(index, styleClass);
    return styleClass;
  }

  // Helper to determine if a style needs the icon wrapper structure
  const iconStyles = new Set([
    'gb-style-win95-error',
    'gb-style-win95-error-alt',
    'gb-style-mac-warning',
    'gb-style-win95-success',
    'gb-style-pastel-success',
    'gb-style-win95-info',
    'gb-style-aqua-info'
  ]);
  function styleRequiresIcon(styleClass: string): boolean {
    return iconStyles.has(styleClass);
  }

  // Helper to get the correct icon character for a style
  function getIconForStyle(styleClass: string): string {
    switch (styleClass) {
      case 'gb-style-win95-error': return '!';
      case 'gb-style-win95-error-alt': return 'X';
      case 'gb-style-mac-warning': return ''; // Icon is CSS pseudo-element
      case 'gb-style-win95-success': return '✔';
      case 'gb-style-pastel-success': return '✔';
      case 'gb-style-win95-info': return 'i';
      case 'gb-style-aqua-info': return 'i';
      default: return '';
    }
  }

  // Clear cache when entries refresh to ensure styles recalculate if needed
  watch(entries, () => {
    styleCache.clear();
  });

</script>

<style scoped>
  /* Import the styles from the dedicated CSS file */
  @import '~/assets/css/guestbook.css';

  /* Add shake animation */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px) rotate(-0.5deg); }
    20%, 40%, 60%, 80% { transform: translateX(2px) rotate(0.5deg); }
  }

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
  input,
  textarea {
    box-shadow: 2px 2px 0px #aaa;
  }
  button {
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
  }
</style>
