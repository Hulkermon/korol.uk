<template>
  <aside class="fr-plan">
    <header class="fr-plan__head">
      <h2 class="fr-plan__title">Plan</h2>
      <p v-if="eventCount > 0" class="fr-plan__totals" data-test="totals">{{ totalsText }}</p>
      <button
        v-if="eventCount > 0 && (!calculated || loading)"
        type="button"
        class="fr-plan__btn fr-plan__calc"
        data-test="calculate"
        :disabled="loading || stops.length < 2"
        :title="stops.length < 2 ? 'Add another stop or a homebase' : undefined"
        @click="emit('calculate')">
        {{ loading ? 'Routing…' : stale ? 'Recalculate route' : 'Calculate route' }}
      </button>
    </header>

    <p v-if="eventCount === 0" class="fr-plan__empty" data-test="empty">
      Click events on the map to add them to your plan.
    </p>

    <ol v-else class="fr-plan__list">
      <template v-for="(stop, i) in stops" :key="stopKey(stop, i)">
        <li
          class="fr-plan__stop"
          :class="{
            'fr-plan__stop--home': stop.kind === 'home',
            'fr-plan__stop--via': stop.kind === 'home' && stop.role === 'via',
          }"
          data-test="stop">
          <span class="fr-plan__num">{{ stop.kind === 'home' ? '🏠' : eventNumber(i) }}</span>
          <div v-if="stop.kind === 'home'" class="fr-plan__body">
            <span class="fr-plan__name" data-test="home-stop">🏠 {{ stop.label }}</span>
            <span v-if="viaGapText(i)" class="fr-plan__via" data-test="via-gap">
              {{ viaGapText(i) }}
            </span>
          </div>
          <div v-else class="fr-plan__body">
            <span class="fr-plan__dates">{{ formatRange(stop.event.start, stop.event.end) }}</span>
            <button
              type="button"
              class="fr-plan__name fr-plan__name--link"
              data-test="select"
              @click="emit('select', stop.event.id)">
              {{ stop.event.name }}
            </button>
            <span class="fr-plan__tier" :style="{ color: TIER_COLORS[stop.event.tier] }">
              {{ tierLabel(stop.event) }}
            </span>
            <p v-if="conflictFor(stop.event.id)" class="fr-plan__warn" data-test="conflict">
              ⚠ {{ conflictText(conflictFor(stop.event.id)!) }}
            </p>
          </div>
          <button
            v-if="stop.kind === 'event'"
            type="button"
            class="fr-plan__remove"
            data-test="remove"
            :aria-label="`Remove ${stop.event.name}`"
            @click="emit('remove', stop.event.id)">
            ×
          </button>
        </li>
        <li
          v-if="i < stops.length - 1 && legText(i)"
          class="fr-plan__leg"
          data-test="leg"
          aria-hidden="true">
          {{ legText(i) }}
        </li>
        <li v-if="nextEventAfter(i)" class="fr-plan__leg fr-plan__leg--trip">
          <button
            type="button"
            class="fr-plan__trip"
            data-test="home-trip"
            :aria-pressed="tripOn(i)"
            :disabled="!home"
            :title="home ? undefined : 'Set a homebase first'"
            @click="toggleTrip(i)">
            🏠 via home{{ hasOverride(i) ? '' : ' (auto)' }}
          </button>
        </li>
      </template>
    </ol>

    <div class="fr-plan__opts">
      <label class="fr-plan__opt">
        <input
          type="checkbox"
          data-test="start-home"
          :checked="options.startAtHome"
          :disabled="!home"
          @change="setOption('startAtHome', ($event.target as HTMLInputElement).checked)" />
        Start from homebase
      </label>
      <label class="fr-plan__opt">
        <input
          type="checkbox"
          data-test="return-home"
          :checked="options.returnHome"
          :disabled="!home"
          @change="setOption('returnHome', ($event.target as HTMLInputElement).checked)" />
        Return to homebase
      </label>
      <label class="fr-plan__opt">
        Go home if gap ≥
        <input
          type="number"
          class="fr-plan__num-input"
          data-test="home-gap"
          min="1"
          max="60"
          step="1"
          :value="options.homeGapDays"
          @change="setGapDays(($event.target as HTMLInputElement).value)" />
        days
      </label>
      <button type="button" class="fr-plan__btn" data-test="set-home" @click="emit('set-home')">
        {{ home ? 'Change homebase' : 'Set homebase' }}
      </button>
      <button
        v-if="eventCount > 0"
        type="button"
        class="fr-plan__btn fr-plan__btn--clear"
        data-test="clear"
        @click="emit('clear')">
        Clear plan
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { Conflict, Homebase, Leg, PlanOptions, Stop } from '@/composables/freeride/planner';
  import { gapDays, homeTripOn, totals } from '@/composables/freeride/planner';
  import { TIER_COLORS } from '@/composables/freeride/pins';
  import type { FreerideEvent } from '@/composables/freeride/types';

  const props = defineProps<{
    stops: Stop[];
    legs: Leg[];
    conflicts: Conflict[];
    home: Homebase | null;
    options: PlanOptions;
    loading: boolean;
    calculated: boolean;
    stale: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'remove', id: string): void;
    (e: 'select', id: string): void;
    (e: 'update:options', value: PlanOptions): void;
    (e: 'set-home'): void;
    (e: 'clear'): void;
    (e: 'calculate'): void;
  }>();

  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const eventCount = computed(() => props.stops.filter((s) => s.kind === 'event').length);

  const fmtKm = (km: number) => Math.round(km).toLocaleString('en');

  function fmtHours(hours: number, approx: boolean): string {
    if (hours < 1) return `${approx ? '~' : ''}${Math.max(1, Math.round(hours * 60))} min`;
    return `${approx ? '~' : ''}${Math.round(hours)} h`;
  }

  function fmtLegHours(hours: number): string {
    const total = Math.round(hours * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  const totalsText = computed(() => {
    if (props.stops.length < 2) return 'Add another stop or a homebase to see the route';
    if (props.loading) return 'routing…';
    if (!props.calculated) return props.stale ? 'Route out of date' : 'Route not calculated';
    const t = totals(props.legs);
    if (t.hours == null) return `~${fmtKm(t.km)} km straight-line`;
    return `${fmtKm(t.km)} km · ${fmtHours(t.hours, true)}`;
  });

  function legText(i: number): string {
    if (props.loading) return 'routing…';
    if (!props.calculated) return '';
    const leg = props.legs.find((l) => l.from === i);
    if (!leg) return '';
    if (leg.source === 'straight' || leg.hours == null) return `≈${fmtKm(leg.km)} km`;
    return `${fmtKm(leg.km)} km · ${fmtLegHours(leg.hours)}`;
  }

  function parts(date: string) {
    const [, m, d] = date.split('-').map(Number);
    return { d, m: MONTHS[m - 1] };
  }

  function formatRange(start: string, end: string): string {
    const s = parts(start);
    const e = parts(end);
    if (start === end) return `${s.d} ${s.m}`;
    if (s.m === e.m) return `${s.d}–${e.d} ${e.m}`;
    return `${s.d} ${s.m} – ${e.d} ${e.m}`;
  }

  function tierLabel(e: FreerideEvent): string {
    const base = e.tier === 'qualifier' ? 'FWQ' : e.tier.toUpperCase();
    return e.stars ? `${base} ${'★'.repeat(e.stars)}` : base;
  }

  const stopKey = (s: Stop, i: number) =>
    s.kind === 'home' ? `home-${s.role}-${i}` : `event-${s.event.id}`;

  function conflictFor(id: string): Conflict | undefined {
    return props.conflicts.find((c) => c.b === id);
  }

  function conflictText(c: Conflict): string {
    if (c.reason === 'tight') return 'Tight: not enough travel days';
    const other = props.stops.find((s) => s.kind === 'event' && s.event.id === c.a);
    const name = other && other.kind === 'event' ? other.event.name : 'another event';
    return `Overlaps with ${name}`;
  }

  function nextEventAfter(i: number): FreerideEvent | null {
    const cur = props.stops[i];
    if (cur?.kind !== 'event') return null;
    for (let j = i + 1; j < props.stops.length; j++) {
      const s = props.stops[j];
      if (s.kind === 'event') return s.event;
    }
    return null;
  }

  function tripOn(i: number): boolean {
    const cur = props.stops[i];
    const next = nextEventAfter(i);
    if (cur?.kind !== 'event' || !next) return false;
    return homeTripOn(cur.event, next, props.options);
  }

  function hasOverride(i: number): boolean {
    const cur = props.stops[i];
    return cur?.kind === 'event' && props.options.homeTrips?.[cur.event.id] !== undefined;
  }

  function toggleTrip(i: number) {
    const cur = props.stops[i];
    if (cur?.kind !== 'event' || !props.home) return;
    emit('update:options', {
      ...props.options,
      homeTrips: { ...props.options.homeTrips, [cur.event.id]: !tripOn(i) },
    });
  }

  function eventNumber(i: number): number {
    return props.stops.slice(0, i + 1).filter((s) => s.kind === 'event').length;
  }

  function viaGapText(i: number): string {
    const via = props.stops[i];
    if (via?.kind !== 'home' || via.role !== 'via') return '';
    const prev = props.stops.find((s) => s.kind === 'event' && s.event.id === via.after);
    let next: FreerideEvent | null = null;
    for (let j = i + 1; j < props.stops.length && !next; j++) {
      const s = props.stops[j];
      if (s.kind === 'event') next = s.event;
    }
    if (!prev || prev.kind !== 'event' || !next) return '';
    return `${gapDays(prev.event, next)} days at home`;
  }

  function setGapDays(raw: string) {
    const n = Math.round(Number(raw));
    if (raw.trim() === '' || Number.isNaN(n)) return;
    emit('update:options', { ...props.options, homeGapDays: Math.min(60, Math.max(1, n)) });
  }

  function setOption(key: 'startAtHome' | 'returnHome', value: boolean) {
    emit('update:options', { ...props.options, [key]: value });
  }
</script>

<style scoped>
  .fr-plan {
    --fr-snow: #f7f9fb;
    --fr-slate: #1f2a37;
    --fr-ice: #5aa9e6;
    --fr-signal: #ff6b1a;
    --fr-muted: #6b7a8a;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 14px;
    background: var(--fr-snow);
    color: var(--fr-slate);
    font-family: system-ui, sans-serif;
    font-size: 14px;
  }
  .fr-plan__head {
    border-bottom: 2px solid var(--fr-ice);
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .fr-plan__title {
    margin: 0;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 26px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .fr-plan__totals {
    margin: 2px 0 0;
    font-weight: 600;
    color: var(--fr-signal);
  }
  .fr-plan__empty {
    color: var(--fr-muted);
  }
  .fr-plan__list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
  }
  .fr-plan__stop {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
  }
  .fr-plan__num {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--fr-slate);
    color: var(--fr-snow);
    font-size: 12px;
    line-height: 22px;
    text-align: center;
  }
  .fr-plan__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .fr-plan__dates,
  .fr-plan__tier {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-plan__tier {
    font-weight: 700;
  }
  .fr-plan__name {
    font-weight: 600;
    text-align: left;
  }
  .fr-plan__name--link {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--fr-slate);
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--fr-ice);
  }
  .fr-plan__warn {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--fr-signal);
  }
  .fr-plan__remove {
    flex: none;
    background: none;
    border: 0;
    font-size: 20px;
    line-height: 1;
    color: var(--fr-muted);
    cursor: pointer;
  }
  .fr-plan__remove:hover {
    color: var(--fr-signal);
  }
  .fr-plan__leg {
    margin-left: 10px;
    padding: 2px 0 2px 18px;
    border-left: 2px dashed var(--fr-ice);
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-plan__stop--via .fr-plan__name,
  .fr-plan__via {
    color: var(--fr-muted);
    font-size: 12px;
  }
  .fr-plan__trip {
    padding: 2px 8px;
    border: 1px solid var(--fr-ice);
    border-radius: 10px;
    background: #fff;
    color: var(--fr-slate);
    font-size: 12px;
    cursor: pointer;
  }
  .fr-plan__trip[aria-pressed='true'] {
    background: var(--fr-ice);
    color: #fff;
  }
  .fr-plan__trip:disabled {
    color: var(--fr-muted);
    cursor: not-allowed;
  }
  .fr-plan__num-input {
    width: 4em;
  }
  .fr-plan__opts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .fr-plan__opt input:disabled + * {
    color: var(--fr-muted);
  }
  .fr-plan__btn {
    padding: 6px 10px;
    border: 1px solid var(--fr-ice);
    border-radius: 4px;
    background: #fff;
    color: var(--fr-slate);
    cursor: pointer;
  }
  .fr-plan__calc {
    margin-top: 6px;
  }
  .fr-plan__btn:disabled {
    color: var(--fr-muted);
    border-color: var(--fr-muted);
    cursor: not-allowed;
  }
  .fr-plan__btn--clear {
    border-color: var(--fr-signal);
    color: var(--fr-signal);
  }
</style>
