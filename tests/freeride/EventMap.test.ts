import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const markerOpts: any[] = vi.hoisted(() => []);

vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet', () => {
  const layer = () => {
    const l: any = {};
    for (const k of ['addTo', 'on', 'bindTooltip', 'setIcon', 'unbindTooltip', 'remove']) {
      l[k] = vi.fn(() => l);
    }
    return l;
  };
  const L = {
    map(el: HTMLElement) {
      el.classList.add('leaflet-container');
      const m: any = {
        setView: vi.fn(() => m),
        on: vi.fn(() => m),
        fitBounds: vi.fn(() => m),
        latLngToContainerPoint: vi.fn(() => ({ x: 0, y: 0 })),
        invalidateSize: vi.fn(),
        remove: vi.fn(),
      };
      return m;
    },
    tileLayer: () => layer(),
    marker: (_ll: unknown, o: unknown) => {
      markerOpts.push(o);
      return layer();
    },
    polyline: () => layer(),
    divIcon: (o: unknown) => o,
    latLngBounds: (b: unknown) => b,
  };
  return { default: L, ...L };
});

import EventMap from '@/components/Freeride/EventMap.vue';
import type { FreerideEvent } from '@/composables/freeride/types';

describe('EventMap', () => {
  it('keeps Leaflet container classes when picking homebase toggles', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const wrapper = mount(EventMap, {
      props: {
        events: [],
        selectedId: null,
        planOrder: {},
        home: null,
        routeLine: [],
        pickingHome: false,
      },
    });
    await flushPromises();
    await flushPromises();
    const leafletEl = wrapper.find('.fr-map');
    expect(leafletEl.classes()).toContain('leaflet-container');

    await wrapper.setProps({ pickingHome: true });

    expect(wrapper.find('.fr-map').classes()).toContain('leaflet-container');
    expect(wrapper.find('.fr-map-wrap').classes()).toContain('fr-map--picking');
    wrapper.unmount();
  });

  it('numbers pin badges by planOrder and omits them for unplanned events', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    markerOpts.length = 0;
    const mk = (id: string, start: string, lat: number): FreerideEvent => ({
      id,
      name: id,
      tier: 'pro',
      stars: null,
      start,
      end: start,
      place: 'X',
      countryCode: 'CH',
      lat,
      lng: 8,
      status: 'upcoming',
      registrationMode: null,
      price: null,
      url: '',
      registerUrl: '',
      divisions: [],
    });
    const wrapper = mount(EventMap, {
      props: {
        events: [
          mk('late', '2026-03-10', 46),
          mk('early', '2026-02-01', 47),
          mk('none', '2026-04-01', 48),
        ],
        selectedId: null,
        planOrder: { early: 1, late: 2 },
        home: null,
        routeLine: [],
        pickingHome: false,
      },
    });
    await flushPromises();
    await flushPromises();
    const badge = (i: number) => {
      const html = String(markerOpts[i].icon.html);
      return /fr-pin__order[^>]*>([^<]*)</.exec(html)?.[1] ?? null;
    };
    expect(badge(0)).toBe('2');
    expect(badge(1)).toBe('1');
    expect(badge(2)).toBeNull();
    wrapper.unmount();
  });
});
