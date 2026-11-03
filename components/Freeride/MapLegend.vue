<template>
  <div class="legend" :style="rootStyle">
    <button
      type="button"
      class="head"
      :aria-expanded="open ? 'true' : 'false'"
      @click="open = !open">
      <span class="title">Legend</span>
      <span class="caret">{{ open ? '▾' : '▸' }}</span>
    </button>
    <div v-if="open" class="body">
      <ul class="tiers">
        <li v-for="row in visibleRows" :key="row.tier" class="row" :data-tier="row.tier">
          <label class="tier-label">
            <input
              type="checkbox"
              class="tier-check"
              :checked="modelValue.tiers[row.tier]"
              :aria-label="row.label"
              @change="toggleTier(row.tier)" />
            <span
              class="swatch"
              :style="{ background: swatchBg(row.tier) }"
              title="1★ light → 4★ dark"></span>
            <span class="name">{{ row.label }}</span>
          </label>
          <span class="count">{{ row.count }}</span>
        </li>
      </ul>
      <div class="stars">
        <button
          v-for="s in STAR_LIST"
          :key="s"
          type="button"
          class="chip"
          :data-stars="s"
          :aria-pressed="modelValue.stars[s] ? 'true' : 'false'"
          @click="toggleStars(s)">
          {{ s }}★ <span class="chip-count">{{ starCounts[s] }}</span>
        </button>
      </div>
      <button type="button" class="reset" @click="reset">reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import {
    DEFAULT_LEGEND,
    countByStars,
    countByTier,
    type LegendFilter,
  } from '@/composables/freeride/filters';
  import { TIER_COLORS, TIER_SHADES } from '@/composables/freeride/pins';
  import type { FreerideEvent, Stars, Tier } from '@/composables/freeride/types';

  const props = defineProps<{
    modelValue: LegendFilter;
    events: FreerideEvent[];
  }>();
  const emit = defineEmits<{ 'update:modelValue': [value: LegendFilter] }>();

  const open = ref(true);

  const rootStyle = {
    '--fr-snow': '#f7f9fb',
    '--fr-slate': '#1f2a37',
    '--fr-ice': '#5aa9e6',
    '--fr-signal': '#ff6b1a',
    '--fr-muted': '#6b7a8a',
  };

  const TIER_ROWS: { tier: Tier; label: string }[] = [
    { tier: 'pro', label: 'FWT Pro' },
    { tier: 'challenger', label: 'FWT Challenger' },
    { tier: 'qualifier', label: 'Qualifier (FWQ)' },
    { tier: 'junior', label: 'Junior' },
  ];
  function swatchBg(t: Tier): string {
    if (t === 'pro') return TIER_COLORS.pro;
    const [a, b, c, d] = TIER_SHADES[t];
    return `linear-gradient(90deg, ${a} 0 25%, ${b} 25% 50%, ${c} 50% 75%, ${d} 75%)`;
  }
  const STAR_LIST: Stars[] = [1, 2, 3, 4];

  const tierCounts = computed(() => countByTier(props.events));
  const starCounts = computed(() => countByStars(props.events));

  const visibleRows = computed(() =>
    TIER_ROWS.map((r) => ({ ...r, count: tierCounts.value[r.tier] })).filter(
      (r) => !(r.tier === 'challenger' && r.count === 0 && props.modelValue.tiers.challenger),
    ),
  );

  function clone(f: LegendFilter): LegendFilter {
    return { tiers: { ...f.tiers }, stars: { ...f.stars } };
  }

  function toggleTier(t: Tier) {
    const next = clone(props.modelValue);
    next.tiers[t] = !next.tiers[t];
    emit('update:modelValue', next);
  }

  function toggleStars(s: Stars) {
    const next = clone(props.modelValue);
    next.stars[s] = !next.stars[s];
    emit('update:modelValue', next);
  }

  function reset() {
    emit('update:modelValue', clone(DEFAULT_LEGEND));
  }
</script>

<style scoped>
  .legend {
    width: 220px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--fr-slate);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(31, 42, 55, 0.25);
    font-family: system-ui, sans-serif;
    font-size: 13px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: 0;
    cursor: pointer;
    color: inherit;
  }
  .title {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .caret {
    color: var(--fr-muted);
  }
  .body {
    padding: 0 12px 10px;
  }
  .tiers {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
  }
  .tier-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .swatch {
    width: 24px;
    height: 10px;
    border-radius: 2px;
    flex: none;
  }
  .count {
    color: var(--fr-muted);
    font-variant-numeric: tabular-nums;
  }
  .stars {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .chip {
    padding: 2px 6px;
    border: 1px solid var(--fr-muted);
    border-radius: 12px;
    background: var(--fr-snow);
    color: var(--fr-muted);
    cursor: pointer;
    font-size: 12px;
  }
  .chip[aria-pressed='true'] {
    background: var(--fr-slate);
    border-color: var(--fr-slate);
    color: #fff;
  }
  .chip-count {
    opacity: 0.7;
  }
  .reset {
    background: none;
    border: 0;
    padding: 0;
    color: var(--fr-ice);
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
  }
</style>
