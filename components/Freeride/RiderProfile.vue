<template>
  <section class="fr-profile">
    <header class="fr-head">
      <img v-if="profile.image" class="fr-photo" :src="profile.image" :alt="profile.name" />
      <span v-else class="fr-photo fr-initials" aria-hidden="true">{{ initials }}</span>
      <div class="fr-who">
        <h2 class="fr-name">{{ profile.name }}</h2>
        <template v-if="profile.nationality">
          <img
            v-if="flag"
            class="fr-flag"
            :src="flag"
            :alt="profile.nationality"
            :title="profile.nationality"
            width="20"
            height="15" />
          <span v-else class="fr-nat">{{ profile.nationality }}</span>
        </template>
      </div>
      <button
        type="button"
        class="fr-star"
        :class="{ on: homie }"
        :aria-pressed="homie"
        :aria-label="starLabel"
        :title="starLabel"
        @click="emit('toggle-homie')">
        {{ homie ? '★' : '☆' }}
      </button>
    </header>

    <div class="fr-points">
      <template v-if="profile.ranking">
        <span class="fr-points-value">{{ formatPoints(profile.ranking.points) }}</span>
        <span class="fr-points-place">#{{ profile.ranking.place }}</span>
        <span class="fr-points-series">
          {{ profile.ranking.series
          }}<template v-if="profile.ranking.division"> · {{ profile.ranking.division }}</template>
        </span>
      </template>
      <span v-else class="fr-points-none">Not ranked yet</span>
    </div>

    <ul v-if="otherRankings.length" class="fr-others">
      <li v-for="(r, i) in otherRankings" :key="i">
        <strong>{{ formatPoints(r.points) }}</strong> · #{{ r.place }} · {{ r.series
        }}<template v-if="r.division"> · {{ r.division }}</template>
      </li>
    </ul>

    <h3 class="fr-title">This season</h3>
    <p v-if="!profile.entries.length" class="fr-empty">No events this season</p>
    <ul v-else class="fr-entries">
      <li v-for="(entry, i) in profile.entries" :key="i" class="fr-entry">
        <span class="fr-dot" :style="{ background: TIER_COLORS[entry.event.tier] }"></span>
        <div class="fr-entry-text">
          <span class="fr-entry-date">{{ formatRange(entry.event.start, entry.event.end) }}</span>
          <button type="button" class="fr-entry-name" @click="emit('open-event', entry.event.id)">
            {{ entry.event.name }}
          </button>
          <span class="fr-entry-div">{{ entry.division }}</span>
        </div>
        <span
          v-if="showResult(entry)"
          class="fr-result"
          :class="{ dropped: entry.result!.dropped }">
          <span class="fr-result-text">{{ resultText(entry) }}</span>
          <span v-if="entry.result!.dropped" class="fr-dropped">dropped</span>
        </span>
        <span v-else-if="entry.status" class="fr-pill" :class="pillClass(entry.status)">{{
          entry.status
        }}</span>
      </li>
    </ul>

    <template v-if="profile.otherResults.length">
      <h3 class="fr-title">Other ranked results</h3>
      <ul class="fr-entries fr-other-results">
        <li v-for="(r, i) in profile.otherResults" :key="i" class="fr-entry">
          <div class="fr-entry-text">
            <span class="fr-entry-date">{{ r.date }}</span>
            <span class="fr-other-name">{{ r.eventName }}</span>
          </div>
          <span class="fr-result" :class="{ dropped: r.dropped }">
            <span class="fr-result-text">#{{ r.place }} · {{ r.points }} pts</span>
            <span v-if="r.dropped" class="fr-dropped">dropped</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { ProfileEntry, RiderProfileData } from '@/composables/freeride/riders';
  import { formatPoints, isFinished } from '@/composables/freeride/riders';
  import { countryCode, flagUrl } from '@/composables/freeride/countries';
  import { TIER_COLORS } from '@/composables/freeride/pins';

  const props = defineProps<{
    profile: RiderProfileData;
    homie: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'toggle-homie'): void;
    (e: 'open-event', id: string): void;
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

  function formatRange(start: string, end: string): string {
    const [, sm, sd] = start.split('-').map(Number);
    const [, em, ed] = end.split('-').map(Number);
    if (start === end) return `${sd} ${MONTHS[sm - 1]}`;
    if (sm === em) return `${sd}–${ed} ${MONTHS[sm - 1]}`;
    return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
  }

  const initials = computed(
    () =>
      props.profile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || '?',
  );

  const flag = computed(() => flagUrl(countryCode(props.profile.nationality)));

  const starLabel = computed(() =>
    props.homie
      ? `Remove ${props.profile.name} from homies`
      : `Add ${props.profile.name} to homies`,
  );

  const otherRankings = computed(() =>
    props.profile.rankings.filter((r) => r !== props.profile.ranking),
  );

  function showResult(entry: ProfileEntry): boolean {
    return !!entry.result && isFinished(entry.event);
  }

  function resultText(entry: ProfileEntry): string {
    const r = entry.result!;
    return r.points === null ? `#${r.place}` : `#${r.place} · ${r.points} pts`;
  }

  function pillClass(status: string) {
    return ['confirmed', 'waitlisted', 'denied', 'withdrawn'].includes(status)
      ? `fr-pill-${status}`
      : 'fr-pill-other';
  }
</script>

<style scoped>
  .fr-profile {
    --fr-snow: #f7f9fb;
    --fr-slate: #1f2a37;
    --fr-ice: #5aa9e6;
    --fr-signal: #ff6b1a;
    --fr-muted: #6b7a8a;
    box-sizing: border-box;
    padding: 16px;
    background: #fff;
    color: var(--fr-slate);
    font-family: system-ui, sans-serif;
  }
  .fr-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .fr-photo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    flex: none;
    background: #e2e8ee;
  }
  .fr-initials {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--fr-slate);
  }
  .fr-who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fr-name {
    margin: 0;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 28px;
    line-height: 1.1;
  }
  .fr-nat {
    color: var(--fr-muted);
    font-size: 13px;
  }
  .fr-flag {
    width: 20px;
    height: 15px;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(31, 42, 55, 0.15);
  }
  .fr-star {
    min-width: 44px;
    min-height: 44px;
    border: 0;
    background: none;
    font-size: 28px;
    line-height: 1;
    color: #a0abb8;
    cursor: pointer;
  }
  .fr-star.on {
    color: #f5a524;
  }
  .fr-points {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin-top: 14px;
    padding: 14px;
    border-radius: 8px;
    background: var(--fr-slate);
    color: #fff;
  }
  .fr-points-value {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 32px;
    font-weight: 700;
  }
  .fr-points-place {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 22px;
    font-weight: 600;
    color: var(--fr-signal);
  }
  .fr-points-series {
    flex-basis: 100%;
    font-size: 13px;
    color: #c5ced8;
  }
  .fr-points-none {
    color: #c5ced8;
  }
  .fr-others {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--fr-muted);
  }
  .fr-others li {
    padding: 2px 0;
  }
  .fr-title {
    margin: 20px 0 6px;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 21px;
  }
  .fr-empty {
    margin: 0;
    color: var(--fr-muted);
    font-style: italic;
  }
  .fr-entries {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .fr-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 0;
    border-bottom: 1px solid #eef1f4;
  }
  .fr-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
  .fr-entry-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .fr-entry-date,
  .fr-entry-div {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-entry-name {
    min-height: 40px;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    color: var(--fr-slate);
    cursor: pointer;
  }
  .fr-entry-name:hover {
    color: var(--fr-signal);
  }
  .fr-other-name {
    font-size: 14px;
  }
  .fr-result {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
  }
  .fr-result.dropped .fr-result-text {
    text-decoration: line-through;
    color: var(--fr-muted);
  }
  .fr-dropped {
    font-size: 11px;
    font-weight: 400;
    color: var(--fr-muted);
  }
  .fr-pill {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
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
