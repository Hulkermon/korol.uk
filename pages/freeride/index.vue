<template>
  <div class="fr-page" :style="rootStyle">
    <header class="fr-top">
      <NuxtLink to="/" class="fr-back">← korol.uk</NuxtLink>
      <div class="fr-titles">
        <h1>FREERIDE PLANNER</h1>
        <span class="fr-sub">FWT &amp; FWQ Europe · 2026/27</span>
      </div>
      <div class="fr-toggle" role="group" aria-label="Mode">
        <button type="button" :class="{ active: !planning }" @click="planning = false">
          Explore
        </button>
        <button type="button" :class="{ active: planning }" @click="planning = true">Plan</button>
      </div>
      <button type="button" class="fr-btn" :class="{ active: pickingHome }" @click="startPicking">
        🏠 Set homebase
      </button>
      <button type="button" class="fr-btn" @click="useMyLocation">📍 Use my location</button>
      <span v-if="notice" class="fr-notice">{{ notice }}</span>
      <span class="fr-data">
        Data from Liveheats ·
        <span :title="fetchedAtText">updated {{ timeAgo(snapshot.fetchedAt, nowTick) }}</span>
      </span>
    </header>

    <div class="fr-main">
      <div class="fr-mapcol">
        <div class="fr-mapwrap">
          <EventMap
            :events="mapEvents"
            :selected-id="selectedId"
            :planned-ids="plannedIds"
            :home="home"
            :route-line="planning ? routeLine : []"
            :picking-home="pickingHome"
            @select="onPinSelect"
            @pick-home="onPickHome" />
          <div class="fr-legend">
            <MapLegend v-model="legend" :events="rangeEvents" />
          </div>
          <div v-if="pickingHome" class="fr-hint">
            Click the map to set your homebase · Esc to cancel
          </div>
          <div v-else-if="focusedName" class="fr-hint fr-hint--homie">
            Showing {{ focusedName }}'s events
            <button type="button" aria-label="Show all events" @click="focusedHomie = null">
              ✕
            </button>
          </div>
        </div>
        <div class="fr-slider">
          <DateRangeSlider v-model="range" :min="bounds.from" :max="bounds.to" />
        </div>
      </div>

      <aside class="fr-side">
        <EventDetail
          v-if="selectedEvent"
          :event="selectedEvent"
          :planned="plannedIds.includes(selectedEvent.id)"
          :planning="planning"
          :homie-keys="homieKeys"
          @close="selectedId = null"
          @toggle-plan="onTogglePlan"
          @toggle-homie="toggleHomie" />
        <template v-else>
          <div class="fr-tabs" role="tablist" aria-label="Side panel">
            <button
              type="button"
              role="tab"
              :aria-selected="sideTab === 'list'"
              :class="{ active: sideTab === 'list' }"
              @click="sideTab = 'list'">
              {{ planning ? 'Plan' : 'Events' }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="sideTab === 'homies'"
              :class="{ active: sideTab === 'homies' }"
              @click="sideTab = 'homies'">
              The Homies ({{ homies.length }})
            </button>
          </div>
          <HomiesPanel
            v-if="sideTab === 'homies'"
            :homies="homies"
            :events="events"
            :focused-key="focusedHomie"
            @focus="focusedHomie = $event"
            @select="selectedId = $event"
            @toggle-homie="toggleHomie" />
          <PlanPanel
            v-else-if="planning"
            :stops="stops"
            :legs="legs"
            :conflicts="conflicts"
            :home="home"
            :options="planOptions"
            :loading="loading"
            @remove="removePlanned"
            @select="selectedId = $event"
            @update:options="planOptions = $event"
            @set-home="startPicking"
            @clear="clearPlan" />
          <div v-else class="fr-list">
            <h2>{{ visible.length }} events in range</h2>
            <button
              v-for="e in visible"
              :key="e.id"
              type="button"
              class="fr-row"
              @click="selectedId = e.id">
              <span class="fr-dot" :style="{ background: TIER_COLORS[e.tier] }"></span>
              <span class="fr-row-text">
                <span class="fr-row-date">{{ formatRange(e.start, e.end) }}</span>
                <span class="fr-row-name">{{ e.name }}</span>
              </span>
            </button>
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import bundledSnapshot from '@/composables/freeride/data/events.json';
  import type { EventSnapshot, FreerideEvent } from '@/composables/freeride/types';
  import {
    filterEvents,
    overlapsRange,
    rebaseRange,
    seasonBounds,
  } from '@/composables/freeride/filters';
  import { timeAgo, useSnapshot } from '@/composables/freeride/useSnapshot';
  import { usePlannerState } from '@/composables/freeride/usePlannerState';
  import {
    buildStops,
    fetchRoute,
    findConflicts,
    straightLegs,
  } from '@/composables/freeride/planner';
  import type { Leg } from '@/composables/freeride/planner';
  import { TIER_COLORS } from '@/composables/freeride/pins';
  import EventMap from '@/components/Freeride/EventMap.vue';
  import DateRangeSlider from '@/components/Freeride/DateRangeSlider.vue';
  import MapLegend from '@/components/Freeride/MapLegend.vue';
  import EventDetail from '@/components/Freeride/EventDetail.vue';
  import PlanPanel from '@/components/Freeride/PlanPanel.vue';
  import HomiesPanel from '@/components/Freeride/HomiesPanel.vue';
  import { allRiders, homieEventIds, useHomies } from '@/composables/freeride/homies';

  useHead({
    title: 'Freeride Planner',
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap',
      },
    ],
  });

  const rootStyle = {
    '--fr-snow': '#f7f9fb',
    '--fr-slate': '#1f2a37',
    '--fr-ice': '#5aa9e6',
    '--fr-signal': '#ff6b1a',
    '--fr-muted': '#6b7a8a',
  };

  const { snapshot, sync, lastSyncAt } = useSnapshot(
    bundledSnapshot as unknown as EventSnapshot,
  );
  const events = computed(() => snapshot.value.events);
  const bounds = computed(() => seasonBounds(events.value));

  const {
    legend,
    range,
    planning,
    plannedIds,
    home,
    planOptions,
    togglePlanned,
    removePlanned,
    clearPlan,
    setHome,
  } = usePlannerState(bounds.value);

  // Drop planned ids that no longer exist in the snapshot
  function pruneMissing() {
    const knownIds = new Set(events.value.map((e) => e.id));
    if (plannedIds.value.some((id) => !knownIds.has(id))) {
      plannedIds.value = plannedIds.value.filter((id) => knownIds.has(id));
    }
    if (selectedId.value && !knownIds.has(selectedId.value)) selectedId.value = null;
  }

  const selectedId = ref<string | null>(null);
  pruneMissing();

  const { homies, toggleHomie } = useHomies(undefined, events);
  const homieKeys = computed(() => homies.value.map((h) => h.key));
  const sideTab = ref<'list' | 'homies'>('list');
  // Rider whose events the map is narrowed to (any rider key, not only homies)
  const focusedHomie = ref<string | null>(null);
  watch(sideTab, (tab) => {
    if (tab !== 'homies') focusedHomie.value = null;
  });
  const focusedName = computed(() => {
    const key = focusedHomie.value;
    if (!key) return null;
    return (
      homies.value.find((h) => h.key === key)?.name ??
      allRiders(events.value).find((r) => r.key === key)?.name ??
      null
    );
  });
  const pickingHome = ref(false);
  const notice = ref('');
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

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

  const fetchedAtText = computed(() => {
    const d = new Date(snapshot.value.fetchedAt);
    if (Number.isNaN(d.getTime())) return snapshot.value.fetchedAt;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  });

  const visible = computed(() => filterEvents(events.value, legend.value, range.value));
  const rangeEvents = computed(() => events.value.filter((e) => overlapsRange(e, range.value)));
  const plannedEvents = computed(() =>
    plannedIds.value
      .map((id) => events.value.find((e) => e.id === id))
      .filter((e): e is FreerideEvent => !!e),
  );
  const mapEvents = computed(() => {
    const planned = new Set(plannedIds.value);
    // A focused rider overrides the legend and date filters: show all their events
    const vis = new Set(
      focusedHomie.value
        ? homieEventIds(events.value, focusedHomie.value)
        : visible.value.map((e) => e.id),
    );
    return events.value.filter((e) => vis.has(e.id) || planned.has(e.id));
  });
  const selectedEvent = computed(() =>
    selectedId.value ? (events.value.find((e) => e.id === selectedId.value) ?? null) : null,
  );

  const stops = computed(() => {
    const evStops = buildStops(plannedEvents.value, home.value, planOptions.value);
    return evStops.some((s) => s.kind === 'event') ? evStops : [];
  });

  const routeKey = computed(() =>
    JSON.stringify([
      stops.value.map((s) => [s.lat, s.lng]),
      planOptions.value.startAtHome,
      planOptions.value.returnHome,
    ]),
  );

  const routed = ref<{ key: string; legs: Leg[]; line: [number, number][] } | null>(null);
  const loading = ref(false);
  let requestId = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const legs = computed<Leg[]>(() =>
    routed.value && routed.value.key === routeKey.value
      ? routed.value.legs
      : straightLegs(stops.value),
  );
  const routeLine = computed<[number, number][]>(() => {
    if (stops.value.length < 2) return [];
    if (routed.value && routed.value.key === routeKey.value) return routed.value.line;
    return stops.value.map((s) => [s.lat, s.lng] as [number, number]);
  });
  const conflicts = computed(() => findConflicts(stops.value, legs.value));

  watch(
    routeKey,
    (key) => {
      clearTimeout(debounce);
      const id = ++requestId;
      if (stops.value.length < 2) {
        loading.value = false;
        return;
      }
      loading.value = true;
      const snap = stops.value;
      debounce = setTimeout(async () => {
        try {
          const res = await fetchRoute(snap);
          if (id !== requestId) return;
          routed.value = { key, legs: res.legs, line: res.line };
        } catch {
          // keep the straight-line fallback
        } finally {
          if (id === requestId) loading.value = false;
        }
      }, 400);
    },
    { immediate: true },
  );

  function onPinSelect(id: string) {
    // In plan mode a pin click only edits the route, so the stop list stays visible
    if (planning.value) {
      togglePlanned(id);
      selectedId.value = null;
      return;
    }
    selectedId.value = id;
  }

  function onTogglePlan(id: string) {
    const adding = !plannedIds.value.includes(id);
    togglePlanned(id);
    if (adding) planning.value = true;
  }

  function startPicking() {
    pickingHome.value = true;
  }

  function onPickHome(pos: { lat: number; lng: number }) {
    setHome({ lat: pos.lat, lng: pos.lng, label: 'Homebase' });
    pickingHome.value = false;
  }

  async function runSync() {
    const oldBounds = bounds.value;
    const result = await sync();
    if (result !== 'updated') return;
    range.value = rebaseRange(range.value, oldBounds, bounds.value);
    pruneMissing();
    showNotice(`Updated · ${events.value.length} events`);
  }

  const SYNC_STALE_MS = 10 * 60 * 1000;
  const nowTick = ref(Date.now());
  let tickTimer: ReturnType<typeof setInterval> | undefined;

  function onVisibility() {
    if (document.visibilityState !== 'visible') return;
    if (lastSyncAt.value === null || Date.now() - lastSyncAt.value > SYNC_STALE_MS) runSync();
  }

  function showNotice(msg: string) {
    notice.value = msg;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice.value = ''), 4000);
  }

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showNotice('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHome({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'My location' });
        pickingHome.value = false;
      },
      () => showNotice('Could not get your location'),
    );
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (pickingHome.value) pickingHome.value = false;
    else selectedId.value = null;
  }

  const route = useRoute();
  const router = useRouter();

  onMounted(() => {
    const wanted = route.query.event;
    if (wanted !== undefined) {
      if (typeof wanted === 'string' && events.value.some((e) => e.id === wanted)) {
        selectedId.value = wanted;
      }
      router.replace({ query: {} });
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    tickTimer = setInterval(() => (nowTick.value = Date.now()), 60000);
    runSync();
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    clearInterval(tickTimer);
    clearTimeout(debounce);
    clearTimeout(noticeTimer);
    requestId++;
  });
</script>

<style scoped>
  .fr-page {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
    background: var(--fr-snow);
    color: var(--fr-slate);
    font-family:
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      sans-serif;
  }
  .fr-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    padding: 8px 14px;
    background: #fff;
    border-bottom: 1px solid #dde3ea;
  }
  .fr-back {
    color: var(--fr-muted);
    text-decoration: none;
    font-size: 14px;
  }
  .fr-back:hover {
    color: var(--fr-signal);
  }
  .fr-titles {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  .fr-titles h1 {
    margin: 0;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-weight: 700;
    font-size: 24px;
    letter-spacing: 0.04em;
  }
  .fr-sub {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-toggle {
    display: inline-flex;
    border: 1px solid var(--fr-slate);
    border-radius: 6px;
    overflow: hidden;
  }
  .fr-toggle button {
    border: 0;
    background: #fff;
    color: var(--fr-slate);
    padding: 6px 14px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .fr-toggle button.active {
    background: var(--fr-slate);
    color: #fff;
  }
  .fr-btn {
    border: 1px solid #c5ced8;
    background: #fff;
    color: var(--fr-slate);
    border-radius: 6px;
    padding: 6px 10px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .fr-btn:hover,
  .fr-btn.active {
    border-color: var(--fr-signal);
    color: var(--fr-signal);
  }
  .fr-notice {
    font-size: 13px;
    color: var(--fr-signal);
  }
  .fr-data {
    margin-left: auto;
    font-size: 12px;
    color: var(--fr-muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .fr-main {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .fr-mapcol {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .fr-mapwrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .fr-legend {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
  }
  .fr-hint {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: var(--fr-slate);
    color: #fff;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 14px;
    pointer-events: none;
  }
  .fr-hint--homie {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
    white-space: nowrap;
  }
  .fr-hint--homie button {
    border: 0;
    background: none;
    color: #fff;
    font: inherit;
    cursor: pointer;
    padding: 0 2px;
  }
  .fr-tabs {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 1;
    background: #fff;
    border-bottom: 1px solid #dde3ea;
  }
  .fr-tabs button {
    flex: 1;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    padding: 10px 8px 7px;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 17px;
    font-weight: 600;
    color: var(--fr-muted);
    cursor: pointer;
  }
  .fr-tabs button.active {
    color: var(--fr-slate);
    border-bottom-color: var(--fr-signal);
  }
  .fr-slider {
    background: #fff;
    border-top: 1px solid #dde3ea;
    padding: 6px 18px;
  }
  .fr-side {
    width: 360px;
    flex: none;
    overflow-y: auto;
    background: #fff;
    border-left: 1px solid #dde3ea;
  }
  .fr-list {
    padding: 12px;
  }
  .fr-list h2 {
    margin: 0 0 8px;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-weight: 600;
    font-size: 20px;
  }
  .fr-row {
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
  .fr-row:hover {
    background: var(--fr-snow);
  }
  .fr-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
  .fr-row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .fr-row-date {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-row-name {
    font-size: 14px;
  }

  @media (max-width: 767px) {
    .fr-main {
      flex-direction: column;
    }
    .fr-side {
      width: auto;
      max-height: 45dvh;
      border-left: 0;
      border-top: 1px solid #dde3ea;
    }
    .fr-data {
      margin-left: 0;
    }
  }
</style>
