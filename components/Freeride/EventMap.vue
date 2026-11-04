<template>
  <div class="fr-map-wrap" :class="{ 'fr-map--picking': pickingHome }">
    <div ref="root" class="fr-map"></div>
  </div>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import 'leaflet/dist/leaflet.css';
  import type { Map as LMap, Marker, Polyline } from 'leaflet';
  import type { FreerideEvent } from '@/composables/freeride/types';
  import { pinHtml, pinClass } from '@/composables/freeride/pins';
  import { spreadOffsets } from '@/composables/freeride/spread';

  const props = defineProps<{
    events: FreerideEvent[];
    selectedId: string | null;
    planOrder: Record<string, number>;
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
  let pending: { lat: number; lng: number; bottomInset: number } | null = null;
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

    const offsets = spreadOffsets(
      props.events.map((e) => {
        const p = map!.latLngToContainerPoint([e.lat, e.lng]);
        return { id: e.id, x: p.x, y: p.y };
      }),
    );

    for (const e of props.events) {
      seen.add(e.id);

      const order = props.planOrder[e.id];
      const state = {
        selected: props.selectedId === e.id,
        planned: order !== undefined,
        order: order ?? null,
      };
      // Overlapping pins are fanned out around their true location
      const offset = offsets.get(e.id) ?? { dx: 0, dy: 0 };
      const key = `${pinClass(e, state)}|${pinHtml(e, state, offset)}|${offset.dx},${offset.dy}`;

      const existing = markers.get(e.id);
      if (existing) {
        if (existing.key !== key) {
          existing.marker.setIcon(makeIcon(e, state, offset));
          existing.marker.unbindTooltip();
          bindTip(existing.marker, e, offset);
          existing.key = key;
        }
        continue;
      }
      const marker = L.marker([e.lat, e.lng], { icon: makeIcon(e, state, offset) });
      bindTip(marker, e, offset);
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
    offset: { dx: number; dy: number },
  ) {
    return L.divIcon({
      html: pinHtml(e, state, offset),
      className: pinClass(e, state),
      iconSize: [30, 40],
      iconAnchor: [15 - offset.dx, 40 - offset.dy],
    });
  }

  function bindTip(marker: Marker, e: FreerideEvent, offset: { dx: number; dy: number }) {
    marker.bindTooltip(tooltipHtml(e), {
      direction: 'top',
      offset: [offset.dx, offset.dy - 40],
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

  // Pans so the point sits centred in the map area above `bottomInset` px; zoom is kept
  function centerOn(lat: number, lng: number, bottomInset = 0) {
    if (unmounted) return;
    if (!map) {
      pending = { lat, lng, bottomInset };
      return;
    }
    const size = map.getSize();
    const p = map.latLngToContainerPoint([lat, lng]);
    map.panBy([p.x - size.x / 2, p.y - (size.y - bottomInset) / 2], { animate: true });
  }

  defineExpose({ centerOn });

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

    map!.on('zoomend', syncEvents);

    resizeObserver = new ResizeObserver(() => map?.invalidateSize());
    resizeObserver.observe(root.value);

    syncEvents();
    syncHome();
    syncRoute();

    if (pending) {
      const { lat, lng, bottomInset } = pending;
      pending = null;
      centerOn(lat, lng, bottomInset);
    }
  });

  watch(() => [props.events, props.selectedId, props.planOrder], syncEvents, { deep: true });
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
  .fr-map-wrap {
    width: 100%;
    height: 100%;
  }

  .fr-map {
    width: 100%;
    height: 100%;
    min-height: 240px;
  }

  .fr-map--picking :deep(.leaflet-container),
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

  :deep(.fr-pin__leader) {
    position: absolute;
    left: 0;
    top: 0;
    z-index: -1;
    pointer-events: none;
  }

  :deep(.fr-pin__leader line) {
    stroke: #1f2a37;
    stroke-opacity: 0.55;
    stroke-width: 1.5;
  }

  :deep(.fr-pin__leader circle) {
    fill: #fff;
    stroke: #1f2a37;
    stroke-width: 1.5;
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

  :deep(.fr-pin--finished .fr-pin__body) {
    opacity: 0.55;
    filter: saturate(0.4);
  }

  :deep(.fr-pin--finished.fr-pin--selected .fr-pin__body),
  :deep(.fr-pin--finished.fr-pin--planned .fr-pin__body) {
    opacity: 1;
    filter: none;
  }

  :deep(.fr-pin__done) {
    position: absolute;
    top: -8px;
    left: -8px;
    transform: rotate(45deg);
    font-size: 11px;
    line-height: 1;
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
