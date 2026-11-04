<template>
  <div class="fr-hb" role="dialog" aria-label="Homebase">
    <div class="fr-hb-current">{{ home ? home.label : 'No homebase set' }}</div>
    <input
      ref="inputEl"
      v-model="query"
      class="fr-hb-input"
      type="text"
      role="combobox"
      aria-label="Search an address or town"
      aria-autocomplete="list"
      :aria-expanded="places.length > 0"
      aria-controls="fr-hb-list"
      :aria-activedescendant="places.length ? `fr-hb-opt-${active}` : undefined"
      placeholder="Search an address or town…"
      autocomplete="off"
      @keydown="onKeydown" />
    <div v-if="loading" class="fr-hb-status">Searching…</div>
    <div v-else-if="error" class="fr-hb-status fr-hb-error">Search failed</div>
    <div v-else-if="empty" class="fr-hb-status">No places found</div>
    <ul v-show="places.length" id="fr-hb-list" class="fr-hb-list" role="listbox">
      <li
        v-for="(p, i) in places"
        :id="`fr-hb-opt-${i}`"
        :key="`${p.lat},${p.lng},${i}`"
        role="option"
        class="fr-hb-opt"
        :class="{ active: i === active }"
        :aria-selected="i === active"
        @mousedown.prevent
        @click="pick(p)">
        {{ p.label }}
      </li>
    </ul>
    <div class="fr-hb-actions">
      <button type="button" class="fr-hb-btn" @click="emit('pick-on-map')">📍 Pick on map</button>
      <button type="button" class="fr-hb-btn" @click="emit('use-location')">
        🎯 Use my location
      </button>
      <button v-if="home" type="button" class="fr-hb-btn" @click="emit('clear-home')">
        Clear homebase
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { searchPlaces } from '@/composables/freeride/geocode';
  import type { Place } from '@/composables/freeride/geocode';
  import type { Homebase } from '@/composables/freeride/planner';

  defineProps<{ home: Homebase | null }>();
  const emit = defineEmits<{
    (e: 'set-home', home: Homebase): void;
    (e: 'pick-on-map'): void;
    (e: 'use-location'): void;
    (e: 'clear-home'): void;
    (e: 'close'): void;
  }>();

  const DEBOUNCE_MS = 300;

  const inputEl = ref<HTMLInputElement | null>(null);
  const query = ref('');
  const places = ref<Place[]>([]);
  const active = ref(0);
  const loading = ref(false);
  const error = ref(false);
  const empty = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;

  function shortLabel(label: string): string {
    return label
      .split(',')
      .slice(0, 2)
      .map((s) => s.trim())
      .join(', ');
  }

  function reset() {
    places.value = [];
    active.value = 0;
    loading.value = false;
    error.value = false;
    empty.value = false;
  }

  async function search(q: string) {
    controller?.abort();
    const ctrl = new AbortController();
    controller = ctrl;
    loading.value = true;
    error.value = false;
    empty.value = false;
    try {
      const res = await searchPlaces(q, { signal: ctrl.signal });
      if (controller !== ctrl) return;
      places.value = res;
      active.value = 0;
      empty.value = res.length === 0;
      loading.value = false;
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      if (controller !== ctrl) return;
      places.value = [];
      error.value = true;
      loading.value = false;
    }
  }

  watch(query, (q) => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    reset();
    if (q.trim().length < 3) return;
    timer = setTimeout(() => search(q), DEBOUNCE_MS);
  });

  function pick(p: Place) {
    emit('set-home', { lat: p.lat, lng: p.lng, label: shortLabel(p.label) });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      emit('close');
    } else if (e.key === 'ArrowDown' && places.value.length) {
      e.preventDefault();
      active.value = (active.value + 1) % places.value.length;
    } else if (e.key === 'ArrowUp' && places.value.length) {
      e.preventDefault();
      active.value = (active.value - 1 + places.value.length) % places.value.length;
    } else if (e.key === 'Enter' && places.value[active.value]) {
      e.preventDefault();
      pick(places.value[active.value]);
    }
  }

  onMounted(() => inputEl.value?.focus());
  onBeforeUnmount(() => {
    clearTimeout(timer);
    controller?.abort();
  });
</script>

<style scoped>
  .fr-hb {
    width: 320px;
    box-sizing: border-box;
    background: #fff;
    color: #1f2a37;
    border: 1px solid #dde3ea;
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(31, 42, 55, 0.22);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
  }
  .fr-hb-current {
    color: #6b7a8a;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .fr-hb-input {
    min-height: 40px;
    box-sizing: border-box;
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #c5ced8;
    border-radius: 6px;
    font: inherit;
  }
  .fr-hb-input:focus {
    outline: 2px solid #5aa9e6;
    outline-offset: 0;
  }
  .fr-hb-status {
    font-size: 13px;
    color: #6b7a8a;
  }
  .fr-hb-error {
    color: #ff6b1a;
  }
  .fr-hb-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid #eef1f4;
    border-radius: 6px;
    max-height: 240px;
    overflow-y: auto;
  }
  .fr-hb-opt {
    min-height: 40px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    padding: 6px 10px;
    cursor: pointer;
    border-bottom: 1px solid #eef1f4;
  }
  .fr-hb-opt:last-child {
    border-bottom: 0;
  }
  .fr-hb-opt:hover,
  .fr-hb-opt.active {
    background: #f7f9fb;
    color: #ff6b1a;
  }
  .fr-hb-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fr-hb-btn {
    min-height: 40px;
    border: 1px solid #c5ced8;
    background: #fff;
    color: #1f2a37;
    border-radius: 6px;
    padding: 6px 10px;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .fr-hb-btn:hover {
    border-color: #ff6b1a;
    color: #ff6b1a;
  }

  @media (max-width: 767px) {
    .fr-hb {
      width: 100%;
    }
  }
</style>
