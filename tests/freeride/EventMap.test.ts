import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

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
    marker: () => layer(),
    polyline: () => layer(),
    divIcon: (o: unknown) => o,
    latLngBounds: (b: unknown) => b,
  };
  return { default: L, ...L };
});

import EventMap from '@/components/Freeride/EventMap.vue';

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
        plannedIds: [],
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
});
