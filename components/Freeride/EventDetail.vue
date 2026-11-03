<template>
  <aside class="fr-detail">
    <button type="button" class="fr-close" aria-label="Close" @click="emit('close')">×</button>

    <span class="fr-badge" :style="{ background: tierColour }">{{ badge }}</span>
    <h2 class="fr-name">{{ event.name }}</h2>
    <p class="fr-dates">{{ dateRange }}</p>
    <p class="fr-place">{{ event.place }}</p>

    <dl class="fr-facts">
      <div>
        <dt>Status</dt>
        <dd class="fr-status">{{ event.status }}</dd>
      </div>
      <div>
        <dt>Registration</dt>
        <dd class="fr-registration">{{ registration }}</dd>
      </div>
      <div>
        <dt>Price</dt>
        <dd class="fr-price">{{ price }}</dd>
      </div>
    </dl>

    <div class="fr-links">
      <a class="fr-link-event" :href="event.url" target="_blank" rel="noopener">
        Event on Liveheats
      </a>
      <a class="fr-link-register" :href="event.registerUrl" target="_blank" rel="noopener">
        Sign up
      </a>
    </div>

    <button type="button" class="fr-plan" @click="emit('toggle-plan', event.id)">
      {{ planned ? 'Remove from plan' : 'Add to plan' }}
    </button>

    <h3 class="fr-riders-title">Riders</h3>
    <p v-if="!event.divisions.length" class="fr-empty">No divisions published yet</p>
    <details v-for="division in event.divisions" :key="division.name" class="fr-division">
      <summary>{{ division.name }} ({{ division.entryCount }})</summary>
      <p v-if="!division.riders.length && division.entryCount > 0" class="fr-hidden">
        Entry list hidden by organiser
      </p>
      <ul v-else class="fr-riders">
        <li v-for="(rider, i) in division.riders" :key="i" class="fr-rider">
          <span class="fr-rider-name">{{ rider.name }}</span>
          <template v-if="rider.nationality">
            <img
              v-if="flagFor(rider.nationality)"
              class="fr-flag"
              :src="flagFor(rider.nationality)!"
              :alt="rider.nationality"
              :title="rider.nationality"
              width="20"
              height="15"
              loading="lazy" />
            <span v-else class="fr-rider-nat">{{ rider.nationality }}</span>
          </template>
          <span class="fr-pill" :class="pillClass(rider.status)">{{ rider.status }}</span>
        </li>
      </ul>
    </details>
  </aside>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import type { FreerideEvent, Tier } from '@/composables/freeride/types';
  import { countryCode, flagUrl } from '@/composables/freeride/countries';

  const props = defineProps<{
    event: FreerideEvent;
    planned: boolean;
    planning: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'toggle-plan', id: string): void;
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

  const TIER_COLOURS: Record<Tier, string> = {
    pro: '#ff6b1a',
    challenger: '#c2410c',
    qualifier: '#1f6feb',
    junior: '#16a34a',
  };

  function parseDate(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return { y, m: m - 1, d };
  }

  function formatDateRange(start: string, end: string): string {
    const a = parseDate(start);
    const b = parseDate(end);
    if (start === end) return `${a.d} ${MONTHS[a.m]} ${a.y}`;
    if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m]} ${a.y}`;
    if (a.y === b.y) return `${a.d} ${MONTHS[a.m]} – ${b.d} ${MONTHS[b.m]} ${a.y}`;
    return `${a.d} ${MONTHS[a.m]} ${a.y} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
  }

  function formatPrice(price: FreerideEvent['price']): string {
    if (!price) return 'Price not listed';
    return new Intl.NumberFormat('en', { style: 'currency', currency: price.currency }).format(
      price.amountCents / 100,
    );
  }

  function registrationLabel(mode: string | null): string {
    if (mode === null) return 'Registration info on Liveheats';
    if (mode === 'waitlist') return 'Waitlist registration';
    if (mode === 'open') return 'Registration open';
    return mode;
  }

  function flagFor(nationality: string | null): string | null {
    return flagUrl(countryCode(nationality));
  }

  function pillClass(status: string) {
    return ['confirmed', 'waitlisted', 'denied', 'withdrawn'].includes(status)
      ? `fr-pill-${status}`
      : 'fr-pill-other';
  }

  const tierColour = computed(() => TIER_COLOURS[props.event.tier]);
  const badge = computed(() => {
    const { tier, stars } = props.event;
    const starText = stars ? ` ${'★'.repeat(stars)}${'☆'.repeat(4 - stars)}` : '';
    if (tier === 'pro') return 'PRO';
    if (tier === 'challenger') return 'CHALLENGER';
    return `${tier === 'qualifier' ? 'FWQ' : 'JUNIOR'}${starText}`;
  });
  const dateRange = computed(() => formatDateRange(props.event.start, props.event.end));
  const price = computed(() => formatPrice(props.event.price));
  const registration = computed(() => registrationLabel(props.event.registrationMode));
</script>

<style scoped>
  .fr-detail {
    --fr-snow: #f7f9fb;
    --fr-slate: #1f2a37;
    --fr-ice: #5aa9e6;
    --fr-signal: #ff6b1a;
    --fr-muted: #6b7a8a;
    position: relative;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 1.25rem;
    background: var(--fr-snow);
    color: var(--fr-slate);
    font-family: system-ui, sans-serif;
  }
  .fr-close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    border: 0;
    background: none;
    font-size: 1.75rem;
    line-height: 1;
    color: var(--fr-muted);
    cursor: pointer;
  }
  .fr-badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 3px;
    color: #fff;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .fr-name {
    margin: 0.6rem 0 0.2rem;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.8rem;
    line-height: 1.1;
  }
  .fr-dates {
    margin: 0;
    font-weight: 600;
  }
  .fr-place {
    margin: 0.1rem 0 1rem;
    color: var(--fr-muted);
  }
  .fr-facts {
    margin: 0 0 1rem;
  }
  .fr-facts div {
    display: flex;
    justify-content: space-between;
    padding: 0.3rem 0;
    border-bottom: 1px solid #e2e8ee;
  }
  .fr-facts dt {
    color: var(--fr-muted);
  }
  .fr-facts dd {
    margin: 0;
  }
  .fr-links {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .fr-links a {
    color: var(--fr-ice);
    font-weight: 600;
  }
  .fr-plan {
    width: 100%;
    padding: 0.6rem;
    border: 0;
    border-radius: 4px;
    background: var(--fr-signal);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
  .fr-riders-title {
    margin: 1.25rem 0 0.4rem;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.3rem;
  }
  .fr-empty,
  .fr-hidden {
    color: var(--fr-muted);
    font-style: italic;
  }
  .fr-division {
    border-top: 1px solid #e2e8ee;
    padding: 0.4rem 0;
  }
  .fr-division summary {
    cursor: pointer;
    font-weight: 600;
  }
  .fr-riders {
    margin: 0.4rem 0 0;
    padding: 0;
    list-style: none;
  }
  .fr-rider {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.15rem 0;
    font-size: 0.9rem;
  }
  .fr-rider-name {
    flex: 1;
  }
  .fr-rider-nat {
    color: var(--fr-muted);
  }
  .fr-flag {
    width: 20px;
    height: 15px;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(31, 42, 55, 0.15);
    vertical-align: middle;
  }
  .fr-pill {
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
