<template>
  <aside class="fr-homies">
    <template v-if="focused">
      <button type="button" class="fr-homies-back" @click="emit('focus', null)">
        ← All homies
      </button>
      <div class="fr-homies-head">
        <h2 class="fr-homies-name">{{ focused.name }}</h2>
        <button
          type="button"
          class="fr-star fr-focused-star"
          :class="{ on: focusedIsHomie }"
          :aria-label="`${focusedIsHomie ? 'Remove' : 'Add'} ${focused.name} ${
            focusedIsHomie ? 'from' : 'to'
          } homies`"
          @click="emit('toggle-homie', focused.name)">
          {{ focusedIsHomie ? '★' : '☆' }}
        </button>
      </div>
      <NuxtLink
        v-if="isIdKey(focused.key)"
        class="fr-profile-link"
        :to="`/freeride/rider/${focused.key}`">
        View profile →
      </NuxtLink>
      <p v-if="!entries.length" class="fr-homies-none">
        Not signed up to any events in this snapshot
      </p>
      <button
        v-for="(entry, i) in entries"
        :key="`${entry.event.id}-${i}`"
        type="button"
        class="fr-entry"
        @click="emit('select', entry.event.id)">
        <span class="fr-dot" :style="{ background: TIER_COLORS[entry.event.tier] }"></span>
        <span class="fr-entry-text">
          <span class="fr-entry-date">{{ formatRange(entry.event.start, entry.event.end) }}</span>
          <span class="fr-entry-name">{{ entry.event.name }}</span>
          <span class="fr-entry-division">{{ entry.division }}</span>
        </span>
        <span v-if="resultText(entry)" class="fr-entry-result">{{ resultText(entry) }}</span>
        <span v-else class="fr-pill" :class="pillClass(entry.status)">{{ entry.status }}</span>
        <span
          v-if="plannedSet.has(entry.event.id)"
          class="fr-inplan"
          title="In your plan"
          aria-label="In your plan"
          >✓</span
        >
      </button>
    </template>

    <template v-else>
      <h2 class="fr-homies-title">The Homies</h2>
      <input
        v-model="query"
        class="fr-homies-search"
        type="search"
        placeholder="Search riders…"
        aria-label="Search riders" />

      <p v-if="!homies.length && !query.trim()" class="fr-homies-empty">
        No homies yet. Star riders in an event's rider list or search to follow them here.
      </p>
      <p v-else-if="homies.length && !homieRows.length" class="fr-homies-none">No homies match</p>

      <section
        v-for="g in homieGroups"
        :key="g.category ?? 'other'"
        class="fr-homie-group"
        :aria-label="g.category ?? 'Other'">
        <h3 v-if="showGroupHeads" class="fr-homies-cat">{{ g.category ?? 'Other' }}</h3>
        <div v-for="{ homie: h, medal } in g.rows" :key="h.key" class="fr-homie">
          <button type="button" class="fr-homie-open" @click="emit('focus', h.key)">
            <span class="fr-homie-name">
              <span v-if="medal" class="fr-medal" :aria-label="MEDALS[medal - 1].label">{{
                MEDALS[medal - 1].icon
              }}</span>
              {{ h.name }}
              <template v-if="nationalityFor(h.key)">
                <img
                  v-if="flagFor(nationalityFor(h.key))"
                  class="fr-flag"
                  :src="flagFor(nationalityFor(h.key))!"
                  :alt="nationalityFor(h.key)!"
                  :title="nationalityFor(h.key)!"
                  width="20"
                  height="15"
                  loading="lazy" />
                <span v-else class="fr-rider-nat">{{ nationalityFor(h.key) }}</span>
              </template>
            </span>
            <span class="fr-homie-count">{{ countText(countFor(h.key)) }}</span>
            <span v-if="pointsText(h.key)" class="fr-homie-points">{{ pointsText(h.key) }}</span>
          </button>
          <button
            type="button"
            class="fr-star on"
            :aria-label="`Remove ${h.name} from homies`"
            @click="emit('toggle-homie', h.name)">
            ★
          </button>
        </div>
      </section>

      <template v-if="searching">
        <h3 class="fr-homies-sub">Other riders</h3>
        <p v-if="!otherRows.length" class="fr-homies-none">No riders match</p>
        <div v-for="r in otherRows" :key="r.key" class="fr-homie fr-rider-result">
          <button type="button" class="fr-homie-open" @click="emit('focus', r.key)">
            <span class="fr-homie-name">
              {{ r.name }}
              <template v-if="r.nationality">
                <img
                  v-if="flagFor(r.nationality)"
                  class="fr-flag"
                  :src="flagFor(r.nationality)!"
                  :alt="r.nationality"
                  :title="r.nationality"
                  width="20"
                  height="15"
                  loading="lazy" />
                <span v-else class="fr-rider-nat">{{ r.nationality }}</span>
              </template>
            </span>
            <span class="fr-homie-count"
              ><template v-if="categoryFor(r.key)">{{ categoryFor(r.key) }} · </template
              >{{ countText(r.eventCount) }}</span
            >
            <span v-if="pointsText(r.key)" class="fr-homie-points">{{ pointsText(r.key) }}</span>
          </button>
          <button
            type="button"
            class="fr-star"
            :aria-label="`Add ${r.name} to homies`"
            @click="emit('toggle-homie', r.name)">
            ☆
          </button>
        </div>
      </template>
    </template>
  </aside>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import type { Homie } from '@/composables/freeride/homies';
  import { allRiders, homieEntries, matchesQuery } from '@/composables/freeride/homies';
  import { TIER_COLORS } from '@/composables/freeride/pins';
  import type { Athlete, FreerideEvent } from '@/composables/freeride/types';
  import {
    formatPoints,
    groupHomies,
    isFinished,
    riderCategory,
    riderPoints,
  } from '@/composables/freeride/riders';
  import { countryCode, flagUrl } from '@/composables/freeride/countries';

  const props = withDefaults(
    defineProps<{
      homies: Homie[];
      events: FreerideEvent[];
      focusedKey: string | null;
      athletes?: Record<string, Athlete>;
      plannedIds?: string[];
    }>(),
    { athletes: () => ({}), plannedIds: () => [] },
  );

  const emit = defineEmits<{
    (e: 'focus', key: string | null): void;
    (e: 'select', eventId: string): void;
    (e: 'toggle-homie', name: string): void;
  }>();

  const plannedSet = computed(() => new Set(props.plannedIds));

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

  const query = ref('');
  watch(
    () => props.focusedKey,
    () => {
      query.value = '';
    },
  );

  const riders = computed(() => allRiders(props.events));
  const counts = computed(() => new Map(riders.value.map((r) => [r.key, r.eventCount])));
  const countFor = (key: string) => counts.value.get(key) ?? 0;
  const nationalities = computed(() => new Map(riders.value.map((r) => [r.key, r.nationality])));
  const nationalityFor = (key: string): string | null =>
    nationalities.value.get(key) ?? props.athletes[key]?.nationality ?? null;

  const focused = computed(() => {
    const key = props.focusedKey;
    if (!key) return null;
    const name =
      props.homies.find((h) => h.key === key)?.name ??
      riders.value.find((r) => r.key === key)?.name;
    return name ? { key, name } : null;
  });
  const focusedIsHomie = computed(() => props.homies.some((h) => h.key === props.focusedKey));
  const entries = computed(() =>
    focused.value ? homieEntries(props.events, focused.value.key) : [],
  );

  const MEDALS = [
    { icon: '🥇', label: '1st' },
    { icon: '🥈', label: '2nd' },
    { icon: '🥉', label: '3rd' },
  ];
  const groupedHomies = computed(() => groupHomies(props.homies, props.athletes, props.events));
  const showGroupHeads = computed(() => groupedHomies.value.length > 1);
  const homieGroups = computed(() =>
    groupedHomies.value
      .map((g) => ({ ...g, rows: g.rows.filter((r) => matchesQuery(r.homie.name, query.value)) }))
      .filter((g) => g.rows.length),
  );
  const homieRows = computed(() => homieGroups.value.flatMap((g) => g.rows));
  const categoryFor = (key: string) => riderCategory(props.athletes, props.events, key);
  const searching = computed(() => query.value.trim().length >= 2);
  const otherRows = computed(() => {
    const keys = new Set(props.homies.map((h) => h.key));
    return riders.value
      .filter((r) => !keys.has(r.key) && matchesQuery(r.name, query.value))
      .slice(0, 30);
  });

  const isIdKey = (key: string) => /^\d+$/.test(key);

  function pointsText(key: string): string {
    const p = riderPoints(props.athletes, key);
    return p ? `${formatPoints(p.points)} · #${p.place}` : '';
  }

  function resultText(entry: { event: FreerideEvent; division: string }): string {
    if (!focused.value || !isFinished(entry.event)) return '';
    const res = entry.event.divisions
      .find((d) => d.name === entry.division)
      ?.results.find((r) => r.athleteId === focused.value!.key);
    if (!res) return '';
    return res.points == null ? `#${res.place}` : `#${res.place} · ${formatPoints(res.points)}`;
  }

  function countText(n: number): string {
    if (n === 0) return 'Not signed up yet';
    return n === 1 ? '1 event' : `${n} events`;
  }

  function formatRange(start: string, end: string): string {
    const [, sm, sd] = start.split('-').map(Number);
    const [, em, ed] = end.split('-').map(Number);
    if (start === end) return `${sd} ${MONTHS[sm - 1]}`;
    if (sm === em) return `${sd}–${ed} ${MONTHS[sm - 1]}`;
    return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
  }

  function flagFor(nationality: string | null): string | null {
    return flagUrl(countryCode(nationality));
  }

  function pillClass(status: string) {
    return ['confirmed', 'waitlisted', 'denied', 'withdrawn'].includes(status)
      ? `fr-pill-${status}`
      : 'fr-pill-other';
  }
</script>

<style scoped>
  .fr-homies {
    --fr-snow: #f7f9fb;
    --fr-slate: #1f2a37;
    --fr-ice: #5aa9e6;
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
  .fr-homies-title,
  .fr-homies-name {
    margin: 0;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 26px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .fr-homies-title {
    border-bottom: 2px solid var(--fr-ice);
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .fr-homies-sub {
    margin: 14px 0 4px;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 18px;
    color: var(--fr-muted);
  }
  .fr-homies-search {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    margin-bottom: 8px;
    border: 1px solid #dde3ea;
    border-radius: 4px;
    font: inherit;
  }
  .fr-homies-cat {
    margin: 12px 0 2px;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fr-ice);
  }
  .fr-homie-group:first-of-type .fr-homies-cat {
    margin-top: 0;
  }
  .fr-homies-empty,
  .fr-homies-none {
    color: var(--fr-muted);
  }
  .fr-homies-back {
    padding: 0;
    margin-bottom: 8px;
    border: 0;
    background: none;
    font: inherit;
    color: var(--fr-ice);
    font-weight: 600;
    cursor: pointer;
  }
  .fr-homies-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 2px solid var(--fr-ice);
    padding-bottom: 8px;
    margin-bottom: 6px;
  }
  .fr-homie {
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #eef1f4;
  }
  .fr-homie-open {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    border: 0;
    background: none;
    padding: 8px 4px;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .fr-homie-open:hover {
    background: #eef1f4;
  }
  .fr-homie-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
  }
  .fr-homie-count,
  .fr-rider-nat {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-homie-points {
    font-size: 12px;
    font-weight: 600;
    color: var(--fr-ice);
  }
  .fr-profile-link {
    display: inline-block;
    margin: 4px 0;
    color: var(--fr-ice);
    font-weight: 600;
    text-decoration: none;
  }
  .fr-entry-result {
    flex: none;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .fr-inplan {
    flex: none;
    margin-left: auto;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1f2a37;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .fr-flag {
    width: 20px;
    height: 15px;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(31, 42, 55, 0.15);
    vertical-align: middle;
  }
  .fr-star {
    flex: none;
    border: 0;
    background: none;
    font-size: 20px;
    line-height: 1;
    color: var(--fr-muted);
    cursor: pointer;
  }
  .fr-star.on {
    color: #f5a524;
  }
  .fr-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    border: 0;
    border-bottom: 1px solid #eef1f4;
    background: none;
    padding: 8px 4px;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .fr-entry:hover {
    background: #eef1f4;
  }
  .fr-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
  .fr-entry-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .fr-entry-date,
  .fr-entry-division {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-pill {
    flex: none;
    padding: 0 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    background: #e2e8ee;
    color: var(--fr-slate);
  }
  .fr-pill-confirmed {
    background: #dcfce7;
    color: #166534;
  }
  .fr-pill-waitlisted {
    background: #fef3c7;
    color: #92400e;
  }
  .fr-pill-denied {
    background: #fee2e2;
    color: #991b1b;
  }
  .fr-pill-withdrawn {
    background: #e5e7eb;
    color: #4b5563;
    text-decoration: line-through;
  }
</style>
