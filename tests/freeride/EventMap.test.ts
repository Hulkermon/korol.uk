import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const markerOpts: any[] = vi.hoisted(() => []);
const lastMap: { current: any } = vi.hoisted(() => ({ current: null }));

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
        getSize: vi.fn(() => ({ x: 400, y: 600 })),
        panBy: vi.fn(),
        invalidateSize: vi.fn(),
        remove: vi.fn(),
      };
      lastMap.current = m;
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

  const baseProps = {
    events: [],
    selectedId: null,
    planOrder: {},
    home: null,
    routeLine: [],
    pickingHome: false,
  };
  const stubRo = () =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );

  it('centerOn pans so the point sits in the area above the inset', async () => {
    stubRo();
    const wrapper = mount(EventMap, { props: baseProps });
    await flushPromises();
    await flushPromises();
    lastMap.current.latLngToContainerPoint.mockReturnValue({ x: 300, y: 100 });
    (wrapper.vm as any).centerOn(1, 2, 100);
    expect(lastMap.current.panBy).toHaveBeenCalledWith([100, -150], { animate: true });
    wrapper.unmount();
  });

  it('applies a centerOn made before Leaflet resolves once after mount', async () => {
    stubRo();
    const wrapper = mount(EventMap, { props: baseProps });
    (wrapper.vm as any).centerOn(1, 2, 0);
    await flushPromises();
    await flushPromises();
    expect(lastMap.current.panBy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
