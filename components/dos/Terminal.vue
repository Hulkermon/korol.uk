<template>
  <div class="crt-wrapper"> <!-- Added wrapper for filter + scanlines -->
    <!-- SVG Filter Definition -->
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <filter id="crt-warp">
          <!-- Generate turbulence noise for displacement -->
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.01" numOctaves="2" result="turbulence"/>
          <!-- Use noise to displace the image -->
          <!-- Adjust scale for more/less pronounced warping -->
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="15" xChannelSelector="R" yChannelSelector="G" result="warp"/>

          <!-- Optional: Add slight blur -->
          <!-- <feGaussianBlur in="warp" stdDeviation="0.5" result="blur"/> -->

          <!-- Optional: Vignette attempt (might need tweaking) -->
          <feGaussianBlur in="warp" stdDeviation="50" result="vignetteBlur"/>
          <feColorMatrix in="vignetteBlur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 50 -10" result="vignetteMat"/>
          <feComposite in="warp" in2="vignetteMat" operator="in" result="finalVignette"/>


           <!-- Use the warped result (or blurred/vignetted) -->
           <!-- <feMerge>
             <feMergeNode in="finalVignette"/>
           </feMerge> -->
        </filter>
      </defs>
    </svg>

    <div class="dos-terminal-container" @click="focusInput">
      <!-- Scanline Overlay -->
      <div class="scanline-overlay"></div>
      <!-- Output area -->
      <div class="output-area" ref="outputAreaRef">
        <div v-for="entry in history" :key="entry.id" class="history-entry">
        <!-- Render multi-line output/error -->
        <template v-if="Array.isArray(entry.text)">
          <div
            v-for="(line, index) in entry.text"
            :key="index"
            :class="getEntryClass(entry.type)"
          >
            {{ line }}
          </div>
        </template>
        <!-- Render single line input/output/error -->
        <template v-else>
          <div :class="getEntryClass(entry.type)">
            {{ entry.text }}
          </div>
        </template>
      </div>
    </div>

    <!-- Input area -->
    <div class="input-line">
      <span class="prompt">{{ promptString }}</span> <!-- Use promptString prop -->
      <input
        ref="inputRef"
        v-model="currentInput"
        type="text"
        class="terminal-input"
        autofocus
        spellcheck="false"
        @keydown.enter="submitCommand"
      />
    </div> <!-- Closing input-line -->
  </div> <!-- Closing dos-terminal-container -->
</div> <!-- Closing crt-wrapper -->
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'; // Import computed
import type { HistoryEntry } from '@/composables/dos/useDosCommands'; // Import type

// Props definition
const props = withDefaults(defineProps<{
  history?: HistoryEntry[]; // Make history optional for standalone use/testing
  terminalColor?: string; // Add prop for text color
  promptString?: string; // Add prop for the prompt
}>(), {
  history: () => [], // Default to empty array
  terminalColor: 'white', // Default color if not provided
  promptString: 'C:\\>', // Default prompt
});

// Map prop color names to actual CSS color values
const colorMap: Record<string, string> = {
    green: '#33ff33', // Bright green
    yellow: '#ffff33', // Bright yellow
    cyan: '#33ffff', // Bright cyan
    white: '#c0c0c0', // Light gray (default)
    red: '#ff6b6b', // Error color
    pink: '#ff99cc', // Pink
};

// Computed property for v-bind in CSS
const terminalColorCss = computed(() => {
    return colorMap[props.terminalColor?.toLowerCase() ?? 'white'] || colorMap['white'];
});


const emit = defineEmits(['submit-command']);

const outputAreaRef = ref<HTMLDivElement | null>(null); // Ref for the output container

const currentInput = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

// Function to determine CSS class based on history entry type
const getEntryClass = (type: HistoryEntry['type']) => {
  switch (type) {
    case 'input': return 'history-input';
    case 'output': return 'history-output';
    case 'error': return 'history-error';
    default: return '';
  }
};

const submitCommand = () => {
  emit('submit-command', currentInput.value);
  currentInput.value = ''; // Clear input after submit
};

// Focus input on mount
onMounted(() => {
  inputRef.value?.focus();
});

// Scroll to bottom when history updates
watch(() => props.history, async () => {
  await nextTick(); // Wait for DOM update
  if (outputAreaRef.value) {
    outputAreaRef.value.scrollTop = outputAreaRef.value.scrollHeight;
  }
}, { deep: true }); // Watch deeply for changes within the array


// Re-focus input if user clicks anywhere in the terminal (basic version)
const focusInput = () => {
   inputRef.value?.focus();
}

// Expose focus method if needed externally
defineExpose({ focusInput });

</script>

<style scoped>
.crt-wrapper {
  @apply relative overflow-hidden; /* Needed for absolute positioning of overlay and filter */
  /* Match terminal size or make it slightly larger for edge effects */
   width: 800px;
   height: 500px;
   border-radius: 15px; /* Simulate curved screen edges */
}

/* Apply Tailwind classes directly where possible, use @apply for complex reuse */
.dos-terminal-container {
  @apply bg-black font-mono p-3 h-full w-full overflow-y-auto relative; /* Ensure it fills wrapper, relative for overlay */
  scrollbar-width: none; /* Hide scrollbar */
  /* Add custom properties for easier theming if needed */
  /* Use v-bind to link CSS var to the computed color value */
  --terminal-text-color: v-bind(terminalColorCss);
  --terminal-bg-color: black;
  --terminal-error-color: #ff6b6b; /* Light red for errors */
  color: var(--terminal-text-color);
  background-color: var(--terminal-bg-color);
  filter: url(#crt-warp); /* Apply the SVG filter */
  /* Ensure filter doesn't clip content */
  padding: 15px; /* Increase padding to prevent text hitting warped edges */
  box-sizing: border-box;
  border-radius: inherit; /* Inherit wrapper's radius */
}

.scanline-overlay {
  @apply absolute inset-0 pointer-events-none; /* Cover container, ignore clicks */
  background: linear-gradient(
    to bottom,
    rgba(18, 16, 16, 0) 50%,
    rgba(0, 0, 0, 0.25) 50%
  );
  background-size: 100% 4px; /* Adjust line thickness */
  z-index: 2; /* Ensure it's above terminal content */
  border-radius: inherit; /* Inherit wrapper's radius */
}


.output-area {
  @apply whitespace-pre-wrap break-words mb-2; /* Allow wrapping, preserve whitespace */
}

.history-entry {
  /* No specific style needed for the entry container itself */
}

.history-input {
  /* Input lines might not need special styling beyond the container's default */
}

.history-output {
  /* Output lines might not need special styling beyond the container's default */
}

.history-error {
  color: var(--terminal-error-color); /* Use error color */
}


.input-line {
  display: flex;
}

.prompt {
  @apply mr-1.5 whitespace-pre; /* Tailwind equivalent */
}

.terminal-input {
  @apply bg-transparent border-none text-inherit outline-none flex-grow p-0 m-0;
  caret-color: var(--terminal-text-color); /* Match text color */
  /* Remove default browser styling */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

/* Blinking cursor using CSS animation */
.terminal-input:focus {
  animation: blink-caret 1s step-end infinite;
}

@keyframes blink-caret {
  from, to { box-shadow: 1px 0 0 0 var(--terminal-text-color); } /* Simulate block cursor */
  50% { box-shadow: none; }
}

/* Hide the default caret */
.terminal-input {
  caret-color: transparent;
}
</style>
