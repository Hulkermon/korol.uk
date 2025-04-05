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
          class="win95-window !static bg-gray-300 border-t-white border-l-white border-r-gray-500 border-b-gray-500 border-2 border-outset"
          :style="getDistortionStyle(index, entries.length)">
          <!-- Title Bar -->
          <div class="win95-title-bar bg-blue-700 text-white p-1 flex justify-between items-center">
            <span class="font-bold text-sm pl-1">Guestbook Entry</span>
            <!-- Fake buttons -->
            <div class="flex space-x-1">
              <button class="w-4 h-4 bg-gray-300 border-t-white border-l-white border-r-gray-500 border-b-gray-500 border-2 border-outset text-black font-bold text-xs leading-none">_</button>
              <button class="w-4 h-4 bg-gray-300 border-t-white border-l-white border-r-gray-500 border-b-gray-500 border-2 border-outset text-black font-bold text-xs leading-none">X</button>
            </div>
          </div>
          <!-- Content Area -->
          <div class="entry-content p-3">
            <p class="font-bold text-black text-sm mb-1">
              {{ entry.name }}
              <span class="text-xs text-gray-600 font-normal"
                >wrote on {{ formatDate(entry.timestamp) }}:</span
              >
            </p>
            <p class="mt-1 text-black text-sm">{{ entry.message }}</p>
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

  // --- Chaos Engine ---
  function getDistortionStyle(index: number, totalEntries: number): Record<string, string> {
    // --- ADJUSTMENT: No distortion for first 5 entries ---
    if (index < 5) {
      return {}; // Return empty style object
    }

    // --- ADJUSTMENT: Recalculate distortion factor to start from index 5 ---
    const safeTotalEntries = Math.max(1, totalEntries); // Avoid division by zero if only 1 entry
    const distortionStartIndex = 5;
    // Calculate factor based on position *after* the initial clean entries
    // Maps index 5 to 0, index (totalEntries - 1) to 1
    const adjustedIndex = index - distortionStartIndex;
    const adjustedRange = Math.max(1, safeTotalEntries - distortionStartIndex); // Avoid division by zero or negative range
    const distortionFactor = adjustedIndex / Math.max(1, adjustedRange -1); // Normalize from 0 to 1 for the distorted range

    const styles: Record<string, string> = {};

    // 1. Positioning Jitter (more intense further down)
    // --- ADJUSTMENT: Reduced max jitter ---
    const jitterAmount = distortionFactor * 10; // Max 10px jitter
    const jitterX = (Math.sin(index * 1.5) * jitterAmount).toFixed(2);
    const jitterY = (Math.cos(index * 0.8) * jitterAmount).toFixed(2);

    // 2. Rotation/Skew (subtle, increases slightly)
    // --- ADJUSTMENT: Reduced max rotation ---
    const maxRotation = distortionFactor * 3; // Max 3 degrees rotation
    const rotation = ((Math.random() - 0.5) * 2 * maxRotation).toFixed(2); // Random rotation within max range
    const skewX = (distortionFactor > 0.2 && index % 5 === 0) ? ((Math.random() - 0.5) * distortionFactor * 3).toFixed(2) : '0'; // Occasional skew, starts earlier, slightly less intense

    // Apply transform only if needed
    if (jitterAmount > 0 || maxRotation > 0 || parseFloat(skewX) !== 0) {
       styles.transform = `translateX(${jitterX}px) translateY(${jitterY}px) rotate(${rotation}deg) skewX(${skewX}deg)`;
    }


    // 3. Color Glitching (hue rotate, desaturate older) - Apply every few entries
    // --- ADJUSTMENT: Start glitching later relative to distortion start ---
    if (distortionFactor > 0.1 && index % 3 === 0) { // Start glitching after the first ~10% of distorted entries
      const hueShift = (index * 10) % 360;
      const saturation = Math.max(0.4, 1 - distortionFactor * 0.6).toFixed(2); // Min 40% saturation
      styles.filter = `hue-rotate(${hueShift}deg) saturate(${saturation})`;
    }

    // 4. Border Breakdown (change style occasionally)
    if (distortionFactor > 0.6 && index % 7 === 0) {
      styles.borderStyle = 'dashed';
      styles.borderColor = `rgb(${Math.random()*150}, ${Math.random()*150}, ${Math.random()*150})`;
    } else if (distortionFactor > 0.8 && index % 5 === 0) {
       styles.borderStyle = 'dotted';
       styles.borderWidth = `${2 + Math.random() * 2}px`; // Slightly thicker border
    }

    // --- ADJUSTMENT: Removed Z-Index Shuffle ---
    // // 5. Z-Index Shuffle (make older ones potentially overlap newer ones)
    // if (distortionFactor > 0.2) {
    //    // Use reverse index for stacking chaos, modulo for range
    //    styles.zIndex = `${(totalEntries - index) % 10}`;
    //    styles.position = 'relative'; // Ensure z-index works
    // }

     // 6. Shake Animation (apply later, slightly reduced intensity)
     // --- ADJUSTMENT: Start shake later, reduced max intensity ---
    if (distortionFactor > 0.4) { // Start shake after first 40% of distorted entries
        const shakeIntensity = (0.1 + distortionFactor * 0.3).toFixed(2); // Duration from 0.1s to 0.4s max
        styles.animation = `shake ${shakeIntensity}s infinite ${ index % 2 === 0 ? 'linear' : 'ease-in-out' }`;
    }

    // 7. Opacity fade for very old entries
    // --- ADJUSTMENT: Start fade later, less aggressive fade ---
    if (distortionFactor > 0.9) { // Start fade only for last 10% of distorted entries
        styles.opacity = `${Math.max(0.6, 1 - (distortionFactor - 0.9) * 4).toFixed(2)}`; // Fade out last 10%, min opacity 0.6
    }


    return styles;
  }

</script>

<style scoped>
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
