<script setup lang="ts">
  import { ref, computed } from 'vue';

  const props = defineProps<{
    phase: 'title' | 'won' | 'lost' | 'paused';
    wave: number;
    totalWaves: number;
    kills: number;
    score: number;
    submitState: 'idle' | 'sending' | 'sent' | 'error';
    rank: number | null;
  }>();

  const emit = defineEmits<{
    (e: 'begin'): void;
    (e: 'restart'): void;
    (e: 'resume'): void;
    (e: 'submit-score', name: string): void;
  }>();

  const name = ref('');
  const trimmed = computed(() => name.value.trim());
  const canSubmit = computed(() => trimmed.value.length > 0 && props.submitState !== 'sending');

  function submit() {
    if (!canSubmit.value) return;
    emit('submit-score', trimmed.value);
  }
</script>

<template>
  <div class="fw-overlay" :class="'fw-overlay-' + phase">
    <div v-if="phase === 'title'" class="fw-panel fw-title">
      <pre class="fw-logo fw-mono">
 ___ ___ ___ _____      ___   _    _       _____  _____
| __|_ _| _ \ __\ \    / /_\ | |  | |     | __\ \/ / __|
| _| | ||   / _| \ \/\/ / _ \| |__| |__ _ | _| >  <| _|
|_| |___|_|_\___| \_/\_/_/ \_\____|____(_)|___/_/\_\___|</pre
      >
      <h1 class="fw-logo-text">FIREWALL.EXE</h1>
      <p class="fw-tagline">Defend the LAN. It is Dec 31, 1999. Everything is on fire.</p>
      <ul class="fw-howto">
        <li>Click a tower in the shop, then click a tile to build it.</li>
        <li>Upgrades fork at level 3. Pick a path wisely.</li>
        <li>Support buildings unlock special abilities.</li>
        <li>Right click cancels.</li>
      </ul>
      <button type="button" class="fw-btn fw-start" @click="emit('begin')">[ START ]</button>
      <div class="fw-construction" />
      <div class="fw-badges">
        <span class="fw-badge88">Best viewed in IE 6 @ 800x600</span>
        <span class="fw-badge88">Made with Notepad</span>
      </div>
    </div>

    <div v-else-if="phase === 'paused'" class="fw-panel fw-paused">
      <h2 class="fw-heading">PAUSED</h2>
      <button type="button" class="fw-btn" @click="emit('resume')">RESUME</button>
    </div>

    <div v-else-if="phase === 'won'" class="fw-panel fw-won">
      <h2 class="fw-heading fw-green">SYSTEM SECURED</h2>
      <div class="fw-copy">
        <div class="fw-copy-label">Copying files...</div>
        <div class="fw-copy-bar"><div class="fw-copy-fill" /></div>
      </div>
      <p>Waves survived: {{ wave }} / {{ totalWaves }}</p>
      <p>Kills: {{ kills }}</p>
      <p class="fw-score">Final score: {{ score }}</p>
      <div v-if="submitState === 'sent'" class="fw-sent">
        <p>Filed in the Hall of Fame: #{{ rank }}</p>
      </div>
      <form v-else class="fw-form" @submit.prevent="submit">
        <label class="fw-label">ENTER YOUR HANDLE</label>
        <input
          v-model="name"
          class="fw-input"
          type="text"
          maxlength="24"
          autocomplete="off"
          @keydown.stop />
        <button type="submit" class="fw-btn" :disabled="!canSubmit">SUBMIT SCORE</button>
        <p v-if="submitState === 'error'" class="fw-error">Submission failed. Try again.</p>
      </form>
      <button type="button" class="fw-btn" @click="emit('restart')">PLAY AGAIN</button>
    </div>

    <div v-else class="fw-panel fw-bsod">
      <h2 class="fw-bsod-title">Windows</h2>
      <p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD FIREWALL(01).</p>
      <p>The LAN has been compromised. Wave reached: {{ wave }} / {{ totalWaves }}</p>
      <p>Kills: {{ kills }}</p>
      <p class="fw-score">Final score: {{ score }}</p>
      <div v-if="submitState === 'sent'" class="fw-sent">
        <p>Filed in the Hall of Fame: #{{ rank }}</p>
      </div>
      <form v-else class="fw-form" @submit.prevent="submit">
        <label class="fw-label">ENTER YOUR HANDLE</label>
        <input
          v-model="name"
          class="fw-input"
          type="text"
          maxlength="24"
          autocomplete="off"
          @keydown.stop />
        <button type="submit" class="fw-btn" :disabled="!canSubmit">SUBMIT SCORE</button>
        <p v-if="submitState === 'error'" class="fw-error">Submission failed. Try again.</p>
      </form>
      <button type="button" class="fw-anykey" @click="emit('restart')">
        Press any key to continue
      </button>
    </div>
  </div>
</template>

<style scoped>
  .fw-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(5, 8, 16, 0.78);
    color: var(--fw-cyan);
    font-family: 'Courier New', monospace;
    text-align: center;
    overflow: auto;
    z-index: 10;
  }
  .fw-panel {
    max-width: 90%;
    padding: 12px 18px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid var(--fw-cyan);
    text-shadow: 0 0 6px currentColor;
  }
  .fw-panel p {
    margin: 4px 0;
  }
  .fw-logo {
    margin: 0;
    font-size: 8px;
    line-height: 1.1;
    color: var(--fw-magenta);
    text-align: left;
    display: inline-block;
  }
  .fw-logo-text {
    margin: 4px 0;
    font-size: 22px;
    letter-spacing: 3px;
    color: var(--fw-cyan);
  }
  .fw-tagline {
    color: var(--fw-yellow);
  }
  .fw-howto {
    margin: 8px auto;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--fw-grey);
  }
  .fw-start {
    margin: 8px 0;
    font-size: 18px;
    padding: 6px 20px;
  }
  .fw-badges {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-top: 8px;
  }
  .fw-badge88 {
    width: 88px;
    height: 31px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    line-height: 1.1;
    background: var(--fw-dark);
    color: var(--fw-light);
    border: 1px solid var(--fw-shadow);
  }
  .fw-heading {
    margin: 0 0 8px;
    letter-spacing: 3px;
  }
  .fw-green {
    color: var(--fw-green);
  }
  .fw-copy {
    margin: 8px 0;
    font-size: 12px;
    color: var(--fw-light);
  }
  .fw-copy-bar {
    height: 14px;
    margin-top: 4px;
    background: var(--fw-light);
    border: 2px inset var(--fw-shadow);
  }
  .fw-copy-fill {
    height: 100%;
    width: 0;
    background: repeating-linear-gradient(90deg, #000080 0 8px, transparent 8px 10px);
    animation: fw-copy 3s linear infinite;
  }
  @keyframes fw-copy {
    to {
      width: 100%;
    }
  }
  .fw-score {
    color: var(--fw-yellow);
    font-weight: bold;
  }
  .fw-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: 8px 0;
  }
  .fw-label {
    font-size: 12px;
  }
  .fw-input {
    width: 200px;
    padding: 2px 4px;
    font-family: inherit;
    background: #000;
    color: var(--fw-green);
    border: 1px solid var(--fw-cyan);
  }
  .fw-error {
    color: var(--fw-red);
    font-size: 12px;
  }
  .fw-sent {
    margin: 8px 0;
    color: var(--fw-green);
  }
  .fw-bsod {
    background: #0000aa;
    color: #fff;
    border: none;
    text-shadow: none;
    text-align: left;
    max-width: 560px;
  }
  .fw-bsod .fw-form {
    align-items: flex-start;
  }
  .fw-bsod-title {
    display: inline-block;
    margin: 0 0 8px;
    padding: 0 8px;
    background: var(--fw-grey);
    color: #0000aa;
  }
  .fw-anykey {
    margin-top: 8px;
    padding: 0;
    background: none;
    border: none;
    color: #fff;
    font-family: inherit;
    cursor: pointer;
    animation: fw-anykey-blink 1s steps(1) infinite;
  }
  @keyframes fw-anykey-blink {
    50% {
      opacity: 0;
    }
  }
</style>
