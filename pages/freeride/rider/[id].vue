<template>
  <div class="fr-page" :style="rootStyle">
    <header class="fr-top">
      <NuxtLink to="/freeride" class="fr-back">← Freeride Planner</NuxtLink>
      <span class="fr-data" :title="fetchedAtText">
        updated {{ timeAgo(snapshot.fetchedAt, nowTick) }}
      </span>
    </header>

    <div v-if="!profile" class="fr-missing">
      <p>Rider not found in this season's data</p>
      <NuxtLink to="/freeride" class="fr-back-link">Back to the planner</NuxtLink>
    </div>

    <div v-else class="fr-main">
      <div class="fr-mapcol">
        <EventMap
          :events="mapEvents"
          :selected-id="null"
          :planned-ids="[]"
          :home="null"
          :route-line="[]"
          :picking-home="false"
          @select="onSelect" />
      </div>
      <div class="fr-side">
        <RiderProfile
          :profile="profile"
          :homie="isHomie(profile.name, profile.id)"
          @toggle-homie="toggleHomie(profile.name, profile.id)"
          @open-event="onSelect" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
  import bundledSnapshot from '@/composables/freeride/data/events.json';
  import type { EventSnapshot, FreerideEvent } from '@/composables/freeride/types';
  import { timeAgo, useSnapshot } from '@/composables/freeride/useSnapshot';
  import { riderProfile } from '@/composables/freeride/riders';
  import { useHomies } from '@/composables/freeride/homies';
  import EventMap from '@/components/Freeride/EventMap.vue';
  import RiderProfile from '@/components/Freeride/RiderProfile.vue';

  const route = useRoute();

  const rootStyle = {
    '--fr-snow': '#f7f9fb',
    '--fr-slate': '#1f2a37',
    '--fr-ice': '#5aa9e6',
    '--fr-signal': '#ff6b1a',
    '--fr-muted': '#6b7a8a',
  };

  const { snapshot, sync } = useSnapshot(bundledSnapshot as unknown as EventSnapshot);
  const events = computed(() => snapshot.value.events);

  const profile = computed(() => riderProfile(snapshot.value, String(route.params.id)));
  const { isHomie, toggleHomie } = useHomies(undefined, events);

  useHead({
    title: computed(() => `${profile.value?.name ?? 'Rider'} · Freeride Planner`),
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap',
      },
    ],
  });

  const mapEvents = computed<FreerideEvent[]>(() => {
    const seen = new Set<string>();
    const out: FreerideEvent[] = [];
    for (const entry of profile.value?.entries ?? []) {
      if (seen.has(entry.event.id)) continue;
      seen.add(entry.event.id);
      out.push(entry.event);
    }
    return out;
  });

  const fetchedAtText = computed(() => snapshot.value.fetchedAt);

  const nowTick = ref(Date.now());
  let tickTimer: ReturnType<typeof setInterval> | undefined;

  function onSelect(id: string) {
    navigateTo('/freeride?event=' + encodeURIComponent(id));
  }

  onMounted(() => {
    tickTimer = setInterval(() => (nowTick.value = Date.now()), 60000);
    sync();
  });
  onBeforeUnmount(() => clearInterval(tickTimer));
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
    align-items: center;
    justify-content: space-between;
    gap: 8px 14px;
    padding: 4px 14px;
    background: #fff;
    border-bottom: 1px solid #dde3ea;
  }
  .fr-back {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    color: var(--fr-muted);
    text-decoration: none;
    font-size: 14px;
  }
  .fr-back:hover {
    color: var(--fr-signal);
  }
  .fr-data {
    font-size: 12px;
    color: var(--fr-muted);
  }
  .fr-missing {
    padding: 32px 16px;
    text-align: center;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 22px;
  }
  .fr-back-link {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    font-family: system-ui, sans-serif;
    font-size: 15px;
    color: var(--fr-ice);
  }
  .fr-main {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .fr-mapcol {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  .fr-side {
    width: 400px;
    flex: none;
    overflow-y: auto;
    background: #fff;
    border-left: 1px solid #dde3ea;
  }

  @media (max-width: 767px) {
    .fr-main {
      flex-direction: column;
    }
    .fr-mapcol {
      flex: none;
      height: 35dvh;
    }
    .fr-side {
      flex: 1;
      width: auto;
      min-height: 0;
      border-left: 0;
      border-top: 1px solid #dde3ea;
    }
  }
</style>
