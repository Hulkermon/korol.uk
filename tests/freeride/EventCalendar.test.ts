import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import EventCalendar from '@/components/Freeride/EventCalendar.vue';
import MapLegend from '@/components/Freeride/MapLegend.vue';
import { DEFAULT_LEGEND } from '@/composables/freeride/filters';
import type { FreerideEvent } from '@/composables/freeride/types';

function ev(p: Partial<FreerideEvent>): FreerideEvent {
  return {
    id: 'x',
    name: 'X',
    tier: 'pro',
    stars: null,
    start: '2026-12-08',
    end: '2026-12-10',
    place: 'Nowhere',
    countryCode: null,
    lat: 0,
    lng: 0,
    status: 'upcoming',
    registrationMode: null,
    price: null,
    url: null,
    registerUrl: null,
    divisions: [],
    ...p,
  } as FreerideEvent;
}

const events = [
  ev({
    id: 'dec',
    name: 'Dec Pro',
    divisions: [
      {
        name: 'Ski Men',
        entryCount: 1,
        riders: [{ athleteId: '42', name: 'Ann Lee', nationality: null, status: 'confirmed' }],
        results: [],
      },
    ] as FreerideEvent['divisions'],
  }),
  ev({
    id: 'dec2',
    name: 'Dec Two',
    tier: 'challenger',
    stars: 2,
    start: '2026-12-15',
    end: '2026-12-15',
  }),
  ev({ id: 'jan', name: 'Jan Pro', start: '2027-01-12', end: '2027-01-14' }),
  ev({ id: 'feb', name: 'Feb Pro', start: '2027-02-02', end: '2027-02-03' }),
];

function make(props: Record<string, unknown> = {}) {
  return mount(EventCalendar, {
    props: {
      events,
      legend: DEFAULT_LEGEND,
      plannedIds: ['jan'],
      homieKeys: ['42'],
      selectedId: null,
      bounds: { from: '2026-12-01', to: '2027-02-28' },
      mobile: false,
      today: '2026-12-05',
      ...props,
    },
  });
}

const barNames = (w: ReturnType<typeof make>) =>
  w.findAll('.fr-cal-bar .fr-cal-bar-name').map((n) => n.text());

describe('EventCalendar', () => {
  it('starts on the month of today', () => {
    expect(make().get('[data-test="month-label"]').text()).toBe('December 2026');
  });

  it('navigates months and disables next at the season end', async () => {
    const w = make();
    await w.get('[data-test="next-month"]').trigger('click');
    expect(w.get('[data-test="month-label"]').text()).toBe('January 2027');
    await w.get('[data-test="next-month"]').trigger('click');
    expect(w.get('[data-test="next-month"]').attributes('disabled')).toBeDefined();
    await w.get('[data-test="prev-month"]').trigger('click');
    await w.get('[data-test="prev-month"]').trigger('click');
    expect(w.get('[data-test="prev-month"]').attributes('disabled')).toBeDefined();
  });

  it('renders bars and emits select on click', async () => {
    const w = make();
    expect(barNames(w).sort()).toEqual(['Dec Pro', 'Dec Two']);
    await w.findAll('.fr-cal-bar')[0].trigger('click');
    expect(w.emitted('select')![0]).toEqual(['dec']);
  });

  it('only-plan narrows to planned events and marks them', async () => {
    const w = make();
    await w.get('[data-test="only-plan"]').trigger('click');
    expect(w.get('[data-test="only-plan"]').attributes('aria-pressed')).toBe('true');
    expect(w.find('.fr-cal-bar').exists()).toBe(false);
    await w.get('[data-test="next-month"]').trigger('click');
    expect(barNames(w)).toEqual(['Jan Pro']);
    expect(w.find('.fr-cal-bar .fr-inplan').exists()).toBe(true);
  });

  it('only-homies narrows to events with a homie rider', async () => {
    const w = make();
    expect(w.find('.fr-inplan').exists()).toBe(false);
    await w.get('[data-test="only-homies"]').trigger('click');
    expect(barNames(w)).toEqual(['Dec Pro']);
  });

  it('re-emits legend updates', () => {
    const w = make();
    const next = { ...DEFAULT_LEGEND };
    w.getComponent(MapLegend).vm.$emit('update:modelValue', next);
    expect(w.emitted('update:legend')![0]).toEqual([next]);
  });

  it('renders an agenda grouped by month on mobile', () => {
    const w = make({ mobile: true });
    expect(w.find('.fr-cal-bar').exists()).toBe(false);
    expect(w.findAll('.fr-cal-group-title').map((n) => n.text())).toEqual([
      'December 2026',
      'January 2027',
      'February 2027',
    ]);
    const rows = w.findAll('.fr-cal-row');
    expect(rows).toHaveLength(4);
    expect(rows[0].text()).toContain('8–10 Dec');
    expect(rows[2].find('.fr-inplan').exists()).toBe(true);
  });

  it('shows the empty state', async () => {
    const w = make({ mobile: true, plannedIds: [] });
    await w.get('[data-test="only-plan"]').trigger('click');
    expect(w.get('.fr-cal-empty').text()).toBe('No events match these filters');
  });
});
