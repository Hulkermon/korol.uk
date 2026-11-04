import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { searchPlaces } from '@/composables/freeride/geocode';
import HomebasePicker from '@/components/Freeride/HomebasePicker.vue';

vi.mock('@/composables/freeride/geocode', () => ({
  searchPlaces: vi.fn(),
  reversePlace: vi.fn(),
}));

const search = vi.mocked(searchPlaces);

const PLACES = [
  { label: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland', lat: 47.37, lng: 8.54 },
  { label: 'Zermatt, Valais, Switzerland', lat: 46.02, lng: 7.75 },
];

const HOME = { lat: 1, lng: 2, label: 'Somewhere' };

function make(home: typeof HOME | null = null) {
  return mount(HomebasePicker, { props: { home }, attachTo: document.body });
}

async function type(w: ReturnType<typeof make>, text: string) {
  await w.get('input').setValue(text);
}

async function settle() {
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
  search.mockResolvedValue(PLACES);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('HomebasePicker', () => {
  it('shows the current label or a placeholder text', () => {
    expect(make().text()).toContain('No homebase set');
    expect(make(HOME).text()).toContain('Somewhere');
  });

  it('focuses the input on mount', () => {
    const w = make();
    expect(document.activeElement).toBe(w.get('input').element);
  });

  it('does not search under 3 characters', async () => {
    const w = make();
    await type(w, 'zu');
    await settle();
    expect(search).not.toHaveBeenCalled();
  });

  it('debounces typing into a single search', async () => {
    const w = make();
    await type(w, 'zur');
    await vi.advanceTimersByTimeAsync(100);
    await type(w, 'zuri');
    await vi.advanceTimersByTimeAsync(100);
    await type(w, 'zuric');
    expect(search).not.toHaveBeenCalled();
    await settle();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe('zuric');
  });

  it('aborts the previous request when a new search starts', async () => {
    search.mockImplementation(() => new Promise(() => {}));
    const w = make();
    await type(w, 'zur');
    await settle();
    const first = search.mock.calls[0][1]!.signal!;
    expect(first.aborted).toBe(false);
    expect(w.text()).toContain('Searching…');
    await type(w, 'zurich');
    await settle();
    expect(first.aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('ignores AbortError rejections', async () => {
    search.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const w = make();
    await type(w, 'zur');
    await settle();
    expect(w.text()).not.toContain('Search failed');
  });

  it('renders suggestions', async () => {
    const w = make();
    await type(w, 'zur');
    await settle();
    const opts = w.findAll('[role="option"]');
    expect(opts).toHaveLength(2);
    expect(opts[0].text()).toContain('Bahnhofstrasse 1');
    expect(w.get('input').attributes('aria-expanded')).toBe('true');
    expect(opts[0].attributes('aria-selected')).toBe('true');
  });

  it('navigates with arrows and picks with Enter using a short label', async () => {
    const w = make();
    await type(w, 'zur');
    await settle();
    const input = w.get('input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    const opts = w.findAll('[role="option"]');
    expect(opts[1].attributes('aria-selected')).toBe('true');
    expect(opts[0].attributes('aria-selected')).toBe('false');
    await input.trigger('keydown', { key: 'ArrowUp' });
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(w.findAll('[role="option"]')[1].attributes('aria-selected')).toBe('true');
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('set-home')![0]).toEqual([
      { lat: 46.02, lng: 7.75, label: 'Zermatt, Valais' },
    ]);
  });

  it('emits set-home when a suggestion is clicked', async () => {
    const w = make();
    await type(w, 'zur');
    await settle();
    await w.findAll('[role="option"]')[0].trigger('click');
    expect(w.emitted('set-home')![0]).toEqual([
      { lat: 47.37, lng: 8.54, label: 'Bahnhofstrasse 1, 8001 Zürich' },
    ]);
  });

  it('emits close on Escape', async () => {
    const w = make();
    await w.get('input').trigger('keydown', { key: 'Escape' });
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('shows an error when the search fails', async () => {
    search.mockRejectedValue(new Error('HTTP 500'));
    const w = make();
    await type(w, 'zur');
    await settle();
    expect(w.text()).toContain('Search failed');
    expect(w.findAll('[role="option"]')).toHaveLength(0);
  });

  it('shows an empty state when nothing matches', async () => {
    search.mockResolvedValue([]);
    const w = make();
    await type(w, 'qqqq');
    await settle();
    expect(w.text()).toContain('No places found');
  });

  it('emits pick-on-map and use-location from the buttons', async () => {
    const w = make();
    const btn = (t: string) => w.findAll('button').find((b) => b.text().includes(t))!;
    await btn('Pick on map').trigger('click');
    await btn('Use my location').trigger('click');
    expect(w.emitted('pick-on-map')).toHaveLength(1);
    expect(w.emitted('use-location')).toHaveLength(1);
  });

  it('offers Clear homebase only when a home is set', async () => {
    expect(make().text()).not.toContain('Clear homebase');
    const w = make(HOME);
    const clear = w.findAll('button').find((b) => b.text().includes('Clear homebase'))!;
    await clear.trigger('click');
    expect(w.emitted('clear-home')).toHaveLength(1);
  });
});
