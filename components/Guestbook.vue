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
          :key="entry.path"
          :class="['gb-entry-window', getRandomStyleClass(index)]"
          class="relative z-[2]">
          <!-- Title Bar -->
          <div class="gb-title-bar" v-if="getRandomStyleClass(index) !== 'gb-style-clippy'">
            <!-- Hide title for clippy -->
            <span class="font-bold text-sm pl-1"
              >Guestbook Entry #{{ entries.length - index }}</span
            >
            <!-- Maybe add fake buttons based on style later if needed -->
          </div>

          <!-- XP Luna Menu Bar -->
          <div v-if="getRandomStyleClass(index) === 'gb-style-xp-luna'" class="gb-menu-bar">
            File | Edit | View | Favorites | Tools | Help
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
              <p class="mt-1 whitespace-pre-wrap">wrapped: {{ entry.message.replaceAll("\\n", "\n") }}</p>
            </div>
          </div>
          <div v-else class="gb-content">
            <p>
              {{ entry.name }}
              <span>wrote on {{ formatDate(entry.timestamp) }}:</span>
            </p>
            <p class="mt-1 whitespace-pre-wrap">wrapped: {{ entry.message.replaceAll("\\n", "\n") }}</p>
          </div>

          <!-- XP Glitch Trail Elements -->
          <template v-if="getRandomStyleClass(index) === 'gb-style-xp-glitch'">
            <div
              v-for="(trailStyle, trailIndex) in trailStyles"
              :key="`trail-${trailIndex}`"
              class="gb-entry-window gb-glitch-trail gb-style-xp-glitch"
              :style="trailStyle">
              <div class="gb-title-bar">
                <span class="font-bold text-sm pl-1"
                  >Guestbook Entry #{{ entries.length - index }}</span
                >
              </div>
              <div class="gb-content">
                <p>
                  {{ entry.name }}
                  <span>wrote on {{ formatDate(entry.timestamp) }}:</span>
                </p>
                <p class="mt-1">{{ entry.message }}</p>
              </div>
            </div>
          </template>

          <!-- Clippy Image - Positioned absolutely relative to the entry window -->
          <img
            v-if="getRandomStyleClass(index) === 'gb-style-clippy'"
            src="/assets/images/clippy_on_paper.png"
            alt="Clippy"
            class="gb-clippy-image"
            @click="glitchOut" />
        </div>
      </div>
      <div v-else class="text-center text-gray-500 italic">Be the first to sign!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue';
  import '~/assets/css/guestbook.css';

  onMounted(() => {
    window.addEventListener('keypress', (event) => {
      if (event.key === 'f') {
        trailStyles.value.push(getTrailStyle(trailStyles.value.length + 1));
      }
    });
  });

  const isGlitching = ref(0); // Counter for the number of bounces

  function glitchOut() {
    if (isGlitching.value > 0) return; // Prevent multiple glitches at once
    v0 = 50 + Math.random() * 150; // Initial velocity (p/s)
    angle = 180; // Math.random() > 0.5 ? 20 + Math.random() * 20 : 140 + Math.random() * 20; // Random angle between 0 and 360 degrees
    deltaT = 0.3 + Math.random() * 0.7; // Time delta (in seconds) for each step
    dragCoefficient = Math.random() * 1; // Drag coefficient (0 = no drag, 1 = full 🐉)

    const loop = setInterval(() => {
      trailStyles.value.push(getTrailStyle(trailStyles.value.length + 1));
      setTimeout(() => {
        clearInterval(loop);
        if (trailStyles.value.length > 0) {
          trailStyles.value.splice(0, 1);
          if (trailStyles.value.length === 0) {
            isGlitching.value = 0; // Reset glitch counter
          }
        }
      }, 2000);
    }, 20 + isGlitching.value++ * 5);
  }

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
    () => queryCollection('guestbook').order('timestamp', 'DESC').all()
    // { server: false }
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
        throw new Error('Oh noes :( Something went wrong!');
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
    'gb-style-vaporwave-alt',
    'gb-style-xp-luna',
    'gb-style-xp-glitch',
    'gb-style-cursed-skull',
    'gb-style-clippy',
    'gb-style-nextstep',
  ];

  // Cache results per index to avoid recalculating style class multiple times per entry
  // Also ensures conditional rendering (v-if) uses the same class as the main :class binding
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
    'gb-style-aqua-info',
  ]);
  function styleRequiresIcon(styleClass: string): boolean {
    return iconStyles.has(styleClass);
  }

  // Helper to get the correct icon character for a style
  function getIconForStyle(styleClass: string): string {
    switch (styleClass) {
      case 'gb-style-win95-error':
        return '!';
      case 'gb-style-win95-error-alt':
        return 'X';
      case 'gb-style-mac-warning':
        return ''; // Icon is CSS pseudo-element
      case 'gb-style-win95-success':
        return '✔';
      case 'gb-style-pastel-success':
        return '✔';
      case 'gb-style-win95-info':
        return 'i';
      case 'gb-style-aqua-info':
        return 'i';
      default:
        return '';
    }
  }

  let angle = 80; // Launch angle in degrees (90 = straight up)
  const angleRad = angle * (Math.PI / 180); // Convert degrees to radians

  let v0 = 100; // Initial velocity (p/s)
  const v0x = v0 * Math.cos(angleRad); // Initial horizontal velocity
  const v0y = v0 * Math.sin(angleRad); // Initial vertical velocity

  const g = 9.81; // Gravitussy (m/s²)
  const fall = (vy: number, t: number) => vy * t - (g / 2) * t ** 2; // applied gravitussy

  let deltaT = 1; // Time delta (in seconds) for each step
  let dragCoefficient = 0.8; // Drag coefficient (0 = no drag, 1 = full 🐉)

  const yBounces = [v0y]; // List of all upward bounces (including the first one)
  let lastBounceTime = 0;
  const floorHeight = 0; // How much the bounce should be shifted down (in px)
  const bounciness = 1;

  const trailStyles: Ref<Record<string, string | number>[]> = ref([]);
  function getTrailStyle(trailIndex: number): Record<string, string | number> {
    const pos = calculateGlitchBounce(trailIndex);
    return {
      transform: `translate(${pos.x.toFixed()}px, ${-pos.y.toFixed()}px)`,
      zIndex: -trailIndex,
    };
  }

  /**
   * Calculates the position of a projectile with air resistance.
   * @param step Number of the step to calculate (1-indexed)
   * @returns x and y positions for each step
   */
  function calculateGlitchBounce(step: number): { x: number; y: number } {
    const t = step * deltaT; // calculate total time elapsed
    const tSinceLastBounce = t - lastBounceTime; // calculate time since last bounce

    // Calculate new x position
    let x = 0;
    x = v0x * t * (1 - dragCoefficient);

    // most recent upward velocity / bounce
    const v0y = yBounces.at(-1);
    if (v0y === undefined) return { x, y: 0 };

    // Calculate new y position
    let y = fall(v0y, tSinceLastBounce);

    // Caluclate current vertical velocity
    let vTy = v0y - g * tSinceLastBounce; // current (T) vertical velocity

    // bounce if new y below floor and is falling down (shiftY might be higher than 0)
    const floor = floorHeight * yBounces.length;
    if (y < floor && vTy < 0) {
      const distanceToFloor = y - floor; // distance below the floor
      const timeFragment = distanceToFloor / vTy; // = distance below bounceShiftY / current vertical velocity (total distance this timeframe)
      lastBounceTime = t - timeFragment;
      vTy = -vTy * bounciness; // bounce vertically and set as current velocity
      y = fall(vTy, timeFragment); // recalculate y with new velocity and time since bounce
      yBounces.push(vTy); // add new upward velocity to the list of bounces
    }

    return { x, y };
  }
</script>

<style scoped>
  /* Import the styles from the dedicated CSS file */
  @import '~/assets/css/guestbook.css';

  /* Ensure Clippy container has relative positioning */
  .gb-style-clippy {
    position: relative;
  }

  /* Add shake animation */
  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-2px) rotate(-0.5deg);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(2px) rotate(0.5deg);
    }
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
