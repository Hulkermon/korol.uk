import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MapLegend from '@/components/Freeride/MapLegend.vue';
import { DEFAULT_LEGEND, type LegendFilter } from '@/composables/freeride/filters';
import type { FreerideEvent, Stars, Tier } from '@/composables/freeride/types';

const ev = (id: string, tier: Tier, stars: Stars | null): FreerideEvent => ({
  id,
  name: id,
  tier,
  stars,
  start: '2027-01-10',
  end: '2027-01-12',
  place: 'X',
  countryCode: null,
  lat: 0,
  lng: 0,
  status: 'upcoming',
  registrationMode: null,
  price: null,
  url: '',
  registerUrl: '',
  divisions: [],
});

const events = [
  ev('a', 'pro', null),
  ev('b', 'qualifier', 3),
  ev('c', 'qualifier', 3),
  ev('d', 'qualifier', 2),
  ev('e', 'challenger', null),
];

const model = (): LegendFilter => ({
  tiers: { ...DEFAULT_LEGEND.tiers },
  stars: { ...DEFAULT_LEGEND.stars },
});

const make = (evts = events, modelValue = model()) =>
  mount(MapLegend, { props: { modelValue, events: evts } });

describe('MapLegend', () => {
  it('renders tier and star counts from events', () => {
    const w = make();
    expect(w.find('[data-tier="pro"] .count').text()).toBe('1');
    expect(w.find('[data-tier="qualifier"] .count').text()).toBe('3');
    expect(w.find('[data-tier="junior"] .count').text()).toBe('0');
    expect(w.find('[data-stars="3"] .chip-count').text()).toBe('2');
    expect(w.find('[data-stars="1"] .chip-count').text()).toBe('0');
  });

  it('hides challenger only when count is 0 and it is on', () => {
    const none = events.filter((e) => e.tier !== 'challenger');
    expect(make(none).find('[data-tier="challenger"]').exists()).toBe(false);
    const off = model();
    off.tiers.challenger = false;
    expect(make(none, off).find('[data-tier="challenger"]').exists()).toBe(true);
    expect(make().find('[data-tier="challenger"]').exists()).toBe(true);
  });

  it('emits a toggled tier with others unchanged, as a new object', async () => {
    const mv = model();
    const w = make(events, mv);
    await w.find('[data-tier="junior"] input').setValue(true);
    const out = w.emitted('update:modelValue')![0][0] as LegendFilter;
    expect(out).not.toBe(mv);
    expect(out.tiers).toEqual({ ...mv.tiers, junior: true });
    expect(out.stars).toEqual(mv.stars);
    expect(mv.tiers.junior).toBe(false);
  });

  it('toggles a star chip', async () => {
    const mv = model();
    const w = make(events, mv);
    expect(w.find('[data-stars="2"]').attributes('aria-pressed')).toBe('true');
    await w.find('[data-stars="2"]').trigger('click');
    const out = w.emitted('update:modelValue')![0][0] as LegendFilter;
    expect(out.stars).toEqual({ ...mv.stars, 2: false });
    expect(out.tiers).toEqual(mv.tiers);
    expect(mv.stars[2]).toBe(true);
  });

  it('reset emits a clone of the default', async () => {
    const mv = model();
    mv.tiers.pro = false;
    const w = make(events, mv);
    await w.find('button.reset').trigger('click');
    const out = w.emitted('update:modelValue')![0][0] as LegendFilter;
    expect(out).toEqual(DEFAULT_LEGEND);
    expect(out).not.toBe(DEFAULT_LEGEND);
    expect(Object.isFrozen(out)).toBe(false);
  });

  it('collapses the body via the header', async () => {
    const w = make();
    const head = w.find('button.head');
    expect(head.attributes('aria-expanded')).toBe('true');
    expect(w.find('.body').exists()).toBe(true);
    await head.trigger('click');
    expect(head.attributes('aria-expanded')).toBe('false');
    expect(w.find('.body').exists()).toBe(false);
  });

  it('starts collapsed when the collapsed prop is set, and can be expanded', async () => {
    const w = mount(MapLegend, { props: { modelValue: model(), events, collapsed: true } });
    const head = w.find('button.head');
    expect(head.attributes('aria-expanded')).toBe('false');
    expect(w.find('.body').exists()).toBe(false);
    await head.trigger('click');
    expect(w.find('.body').exists()).toBe(true);
  });
});
