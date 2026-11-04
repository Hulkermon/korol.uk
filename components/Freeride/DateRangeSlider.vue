<template>
  <div class="range" :style="rootStyle">
    <div class="labels">
      <span class="label">{{ fmt(modelValue.from) }}</span>
      <button v-if="!isFull" type="button" class="reset" @click="reset">reset</button>
      <span class="label">{{ fmt(modelValue.to) }}</span>
    </div>
    <div class="track-wrap">
      <div class="track"></div>
      <div class="fill" :style="{ left: `${fromPct}%`, width: `${toPct - fromPct}%` }"></div>
      <input
        class="thumb"
        type="range"
        aria-label="From date"
        :min="0"
        :max="total"
        :step="1"
        :value="fromNum"
        @input="onFrom" />
      <input
        class="thumb"
        type="range"
        aria-label="To date"
        :min="0"
        :max="total"
        :step="1"
        :value="toNum"
        @input="onTo" />
    </div>
    <div class="ticks">
      <span v-for="t in ticks" :key="t.label + t.pct" class="tick" :style="{ left: `${t.pct}%` }">
        {{ t.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps<{
    min: string;
    max: string;
    modelValue: { from: string; to: string };
  }>();
  const emit = defineEmits<{
    (e: 'update:modelValue', value: { from: string; to: string }): void;
  }>();

  const DAY = 86400000;
  const toMs = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const toStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const rootStyle = {
    '--fr-snow': '#f7f9fb',
    '--fr-slate': '#1f2a37',
    '--fr-ice': '#5aa9e6',
    '--fr-signal': '#ff6b1a',
    '--fr-muted': '#6b7a8a',
  };

  const minMs = computed(() => toMs(props.min));
  const total = computed(() => Math.max(1, Math.round((toMs(props.max) - minMs.value) / DAY)));
  const toDay = (s: string) => Math.round((toMs(s) - minMs.value) / DAY);
  const fromNum = computed(() => toDay(props.modelValue.from));
  const toNum = computed(() => toDay(props.modelValue.to));
  const fromPct = computed(() => (fromNum.value / total.value) * 100);
  const toPct = computed(() => (toNum.value / total.value) * 100);
  const isFull = computed(
    () => props.modelValue.from === props.min && props.modelValue.to === props.max,
  );

  const fmt = (s: string) =>
    new Date(toMs(s)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const ticks = computed(() => {
    const out: { label: string; pct: number }[] = [];
    const start = new Date(minMs.value);
    let y = start.getUTCFullYear();
    let m = start.getUTCMonth();
    const endMs = minMs.value + total.value * DAY;
    for (;;) {
      const ms = Date.UTC(y, m, 1);
      if (ms > endMs) break;
      if (ms >= minMs.value) {
        out.push({
          label: new Date(ms).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
          pct: ((ms - minMs.value) / DAY / total.value) * 100,
        });
      }
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  });

  const emitRange = (fromDay: number, toDayN: number) =>
    emit('update:modelValue', {
      from: toStr(minMs.value + fromDay * DAY),
      to: toStr(minMs.value + toDayN * DAY),
    });

  const onFrom = (e: Event) => {
    const v = Number((e.target as HTMLInputElement).value);
    const clamped = Math.min(v, toNum.value);
    (e.target as HTMLInputElement).value = String(clamped);
    emitRange(clamped, toNum.value);
  };
  const onTo = (e: Event) => {
    const v = Number((e.target as HTMLInputElement).value);
    const clamped = Math.max(v, fromNum.value);
    (e.target as HTMLInputElement).value = String(clamped);
    emitRange(fromNum.value, clamped);
  };
  const reset = () => emit('update:modelValue', { from: props.min, to: props.max });
</script>

<style scoped>
  .range {
    color: var(--fr-slate);
    padding: 4px 12px 8px;
  }
  .labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
  }
  .reset {
    background: none;
    border: 1px solid var(--fr-muted);
    color: var(--fr-muted);
    border-radius: 999px;
    font-size: 0.8rem;
    padding: 2px 10px;
    cursor: pointer;
  }
  .reset:hover {
    border-color: var(--fr-signal);
    color: var(--fr-signal);
  }
  .track-wrap {
    position: relative;
    height: 44px;
    touch-action: none;
  }
  .track,
  .fill {
    position: absolute;
    top: 50%;
    height: 4px;
    margin-top: -2px;
    border-radius: 2px;
  }
  .track {
    left: 0;
    right: 0;
    background: #dbe3ea;
  }
  .fill {
    background: var(--fr-ice);
  }
  .thumb {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 44px;
    margin: 0;
    background: none;
    pointer-events: none;
    touch-action: none;
    appearance: none;
    -webkit-appearance: none;
  }
  .thumb::-webkit-slider-runnable-track {
    background: transparent;
    height: 44px;
  }
  .thumb::-moz-range-track {
    background: transparent;
    height: 44px;
  }
  .thumb::-webkit-slider-thumb {
    -webkit-appearance: none;
    pointer-events: auto;
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    margin-top: 8px;
    border-radius: 50%;
    background: var(--fr-snow);
    border: 3px solid var(--fr-signal);
    cursor: grab;
  }
  .thumb::-moz-range-thumb {
    pointer-events: auto;
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--fr-snow);
    border: 3px solid var(--fr-signal);
    cursor: grab;
  }
  .ticks {
    position: relative;
    height: 1.2rem;
    font-size: 0.75rem;
    color: var(--fr-muted);
  }
  .tick {
    position: absolute;
    transform: translateX(-50%);
  }
</style>
