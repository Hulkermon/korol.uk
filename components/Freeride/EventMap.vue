<template>
  <div ref="root" class="fr-map" :class="{ 'fr-map--picking': pickingHome }"></div>
</template>

<script setup lang="ts">
  import 'leaflet/dist/leaflet.css';
  import type { Map as LMap, Marker, Polyline } from 'leaflet';
  import type { FreerideEvent } from '@/composables/freeride/types';
  import { pinHtml, pinClass } from '@/composables/freeride/pins';

  const props = defineProps<{
    events: FreerideEvent[];
    selectedId: string | null;
    plannedIds: string[];
    home: { lat: number; lng: number; label: string } | null;
    routeLine: [number, number][];
    pickingHome: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'select', id: string): void;
    (e: 'pick-home', pos: { lat: number; lng: number }): void;
  }>();

  const root = ref<HTMLElement | null>(null);

  let L: any = null;
  let map: LMap | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let routeLayer: Polyline | null = null;
  let homeMarker: Marker | null = null;
  let fitted = false;
  let unmounted = false;
  const markers = new Map<string, { marker: Marker; key: string }>();

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tooltipHtml(e: FreerideEvent): string {
    const dates = e.start === e.end ? e.start : `${e.start} – ${e.end}`;
    return `<strong>${escapeHtml(e.name)}</strong><br>${escapeHtml(dates)}`;
  }

  function syncEvents() {
    if (!map || !L) return;
    const seen = new Set<string>();
    const coordCount = new Map<string, number>();

    for (const e of props.events) {
      seen.add(e.id);
      const coord = `${e.lat},${e.lng}`;
      const dupIndex = coordCount.get(coord) ?? 0;
      coordCount.set(coord, dupIndex + 1);

      const planIdx = props.plannedIds.indexOf(e.id);
      const state = {
        selected: props.selectedId === e.id,
        planned: planIdx !== -1,
        order: planIdx !== -1 ? planIdx + 1 : null,
      };
      // Offset events sharing coordinates so each stays clickable
      const anchor: [number, number] = [15 - dupIndex * 8, 40 - dupIndex * 4];
      const key = `${pinClass(e, state)}|${pinHtml(e, state)}|${anchor.join(',')}`;

      const existing = markers.get(e.id);
      if (existing) {
        if (existing.key !== key) {
          existing.marker.setIcon(makeIcon(e, state, anchor));
          existing.key = key;
        }
        continue;
      }
      const marker = L.marker([e.lat, e.lng], { icon: makeIcon(e, state, anchor) });
      marker.bindTooltip(tooltipHtml(e), { direction: 'top', offset: [0, -40] });
      marker.on('click', () => emit('select', e.id));
      marker.addTo(map);
      markers.set(e.id, { marker, key });
    }

    for (const [id, entry] of markers) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markers.delete(id);
      }
    }

    if (!fitted && props.events.length) {
      fitted = true;
      map.fitBounds(L.latLngBounds(props.events.map((e) => [e.lat, e.lng])), {
        padding: [40, 40],
        maxZoom: 8,
      });
    }
  }

  function makeIcon(
    e: FreerideEvent,
    state: { selected: boolean; planned: boolean; order: number | null },
    anchor: [number, number],
  ) {
    return L.divIcon({
      html: pinHtml(e, state),
      className: pinClass(e, state),
      iconSize: [30, 40],
      iconAnchor: anchor,
    });
  }

  function syncHome() {
    if (!map || !L) return;
    if (homeMarker) {
      homeMarker.remove();
      homeMarker = null;
    }
    if (!props.home) return;
    homeMarker = L.marker([props.home.lat, props.home.lng], {
      icon: L.divIcon({
        html: '🏠',
        className: 'fr-home',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
      zIndexOffset: 1000,
    }).addTo(map);
    homeMarker!.bindTooltip(escapeHtml(props.home.label), { direction: 'top' });
  }

  function syncRoute() {
    if (!map || !L) return;
    if (routeLayer) {
      routeLayer.remove();
      routeLayer = null;
    }
    if (props.routeLine.length < 2) return;
    routeLayer = L.polyline(props.routeLine, { color: '#ff6b1a', weight: 4 }).addTo(map);
  }

  onMounted(async () => {
    const mod: any = await import('leaflet');
    L = mod.default ?? mod;
    if (unmounted || !root.value) return;

    map = L.map(root.value).setView([46.5, 9.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map!.on('click', (ev: any) => {
      if (props.pickingHome) emit('pick-home', { lat: ev.latlng.lat, lng: ev.latlng.lng });
    });

    resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(root.value);

    syncEvents();
    syncHome();
    syncRoute();
  });

  watch(() => [props.events, props.selectedId, props.plannedIds], syncEvents, { deep: true });
  watch(() => props.home, syncHome, { deep: true });
  watch(() => props.routeLine, syncRoute, { deep: true });

  onBeforeUnmount(() => {
    unmounted = true;
    resizeObserver?.disconnect();
    resizeObserver = null;
    markers.clear();
    map?.remove();
    map = null;
  });
</script>

<style scoped>
  .fr-map {
    width: 100%;
    height: 100%;
    min-height: 240px;
  }

  .fr-map--picking,
  .fr-map--picking :deep(.leaflet-grab),
  .fr-map--picking :deep(.leaflet-interactive) {
    cursor: crosshair;
  }

  :deep(.leaflet-div-icon) {
    background: none;
    border: none;
  }

  :deep(.fr-home) {
    font-size: 24px;
    line-height: 30px;
    text-align: center;
  }

  :deep(.fr-pin__body) {
    position: relative;
    width: 30px;
    height: 30px;
    background: var(--pin-color, #ff6b1a);
    border: 2px solid #fff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 5px rgba(31, 42, 55, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.fr-pin__label) {
    transform: rotate(45deg);
    color: #fff;
    font:
      700 9px/1 system-ui,
      sans-serif;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  :deep(.fr-pin__row) {
    display: block;
    text-align: center;
  }

  :deep(.fr-pin--rows2 .fr-pin__label) {
    font-size: 8px;
    line-height: 1;
  }

  :deep(.fr-pin--light .fr-pin__label) {
    color: #1f2a37;
  }

  :deep(.fr-pin__order) {
    position: absolute;
    top: -8px;
    right: -8px;
    transform: rotate(45deg);
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    box-sizing: border-box;
    border-radius: 8px;
    background: #1f2a37;
    color: #fff;
    font:
      700 10px/16px system-ui,
      sans-serif;
    text-align: center;
  }

  :deep(.fr-pin--selected .fr-pin__body) {
    outline: 3px solid #5aa9e6;
    z-index: 2;
  }

  :deep(.fr-pin--planned .fr-pin__body) {
    border-color: #1f2a37;
  }
</style>
