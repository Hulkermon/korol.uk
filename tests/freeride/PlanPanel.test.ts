import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlanPanel from '@/components/Freeride/PlanPanel.vue';
import type { Conflict, Leg, PlanOptions, Stop } from '@/composables/freeride/planner';
import type { FreerideEvent } from '@/composables/freeride/types';

function ev(over: Partial<FreerideEvent> = {}): FreerideEvent {
  return {
    id: 'e1',
    name: 'Nendaz Freeride',
    tier: 'qualifier',
    stars: 2,
    start: '2026-02-22',
    end: '2026-02-24',
    place: 'Nendaz, Switzerland',
    countryCode: 'CH',
    lat: 46.1,
    lng: 7.3,
    status: 'upcoming',
    registrationMode: null,
    price: null,
    url: '',
    registerUrl: '',
    divisions: [],
    ...over,
  };
}

const eventStop = (e: FreerideEvent): Stop => ({
  kind: 'event',
  event: e,
  lat: e.lat,
  lng: e.lng,
  label: e.name,
});
const homeStop = (role: 'start' | 'end'): Stop => ({
  kind: 'home',
  role,
  lat: 47,
  lng: 8,
  label: 'Zurich',
});

const A = ev();
const B = ev({
  id: 'e2',
  name: 'Verbier Pro',
  tier: 'pro',
  stars: null,
  start: '2026-02-25',
  end: '2026-02-26',
});
const osrmLeg: Leg = { from: 0, to: 1, km: 212.4, hours: 2 + 40 / 60, source: 'osrm' };
const straightLeg: Leg = { from: 0, to: 1, km: 212.4, hours: null, source: 'straight' };
const opts: PlanOptions = {
  startAtHome: false,
  returnHome: false,
  homeTrips: {},
  homeGapDays: 5,
};
const home = { lat: 47, lng: 8, label: 'Zurich' };

function make(props: Record<string, unknown> = {}) {
  return mount(PlanPanel, {
    props: {
      stops: [eventStop(A), eventStop(B)],
      legs: [osrmLeg],
      conflicts: [],
      home: null,
      options: opts,
      loading: false,
      calculated: true,
      stale: false,
      ...props,
    },
  });
}

describe('PlanPanel', () => {
  it('shows the empty state and hides clear with no event stops', () => {
    const w = make({ stops: [], legs: [] });
    expect(w.find('[data-test="empty"]').text()).toBe(
      'Click events on the map to add them to your plan.',
    );
    expect(w.find('[data-test="clear"]').exists()).toBe(false);
    expect(w.find('[data-test="stop"]').exists()).toBe(false);
  });

  it('renders stops in order with date, name, tier and home icons', () => {
    const w = make({
      stops: [homeStop('start'), eventStop(A), eventStop(B), homeStop('end')],
      legs: [],
      home,
    });
    const stops = w.findAll('[data-test="stop"]');
    expect(stops).toHaveLength(4);
    expect(stops[0].text()).toContain('🏠 Zurich');
    expect(stops[1].text()).toContain('22–24 Feb');
    expect(stops[1].text()).toContain('Nendaz Freeride');
    expect(stops[1].text()).toContain('FWQ ★★');
    expect(stops[2].text()).toContain('Verbier Pro');
    expect(stops[2].text()).toContain('PRO');
    expect(stops[2].text()).not.toContain('★');
    expect(stops[3].text()).toContain('🏠 Zurich');
    expect(stops[0].find('.fr-plan__num').text()).toBe('🏠');
    expect(stops[1].find('.fr-plan__num').text()).toBe('1');
    expect(stops[2].find('.fr-plan__num').text()).toBe('2');
    expect(stops[3].find('.fr-plan__num').text()).toBe('🏠');
  });

  it('numbers events only, skipping a via-home stop between them', () => {
    const via: Stop = { kind: 'home', role: 'via', lat: 47, lng: 8, label: 'Zurich' };
    const w = make({ stops: [homeStop('start'), eventStop(A), via, eventStop(B)], home });
    const nums = w.findAll('.fr-plan__num').map((n) => n.text());
    expect(nums).toEqual(['🏠', '1', '🏠', '2']);
  });

  it('formats junior stars and cross-month ranges', () => {
    const J = ev({ id: 'j', tier: 'junior', stars: 3, start: '2026-02-28', end: '2026-03-02' });
    const w = make({ stops: [eventStop(J)], legs: [] });
    expect(w.text()).toContain('JUNIOR ★★★');
    expect(w.text()).toContain('28 Feb – 2 Mar');
  });

  it('shows osrm and straight leg text', () => {
    expect(make().find('[data-test="leg"]').text()).toBe('212 km · 2 h 40 min');
    expect(
      make({ legs: [straightLeg] })
        .find('[data-test="leg"]')
        .text(),
    ).toBe('≈212 km');
  });

  it('formats totals for osrm and straight legs', () => {
    const long: Leg = { from: 0, to: 1, km: 1233.6, hours: 14.2, source: 'osrm' };
    expect(
      make({ legs: [long] })
        .find('[data-test="totals"]')
        .text(),
    ).toBe('1,234 km · ~14 h');
    expect(
      make({ legs: [straightLeg] })
        .find('[data-test="totals"]')
        .text(),
    ).toBe('~212 km straight-line');
    const short: Leg = { from: 0, to: 1, km: 20, hours: 0.5, source: 'osrm' };
    expect(
      make({ legs: [short] })
        .find('[data-test="totals"]')
        .text(),
    ).toBe('20 km · ~30 min');
  });

  it('prompts for a second stop instead of zero totals with a single stop', () => {
    const w = make({ stops: [eventStop(A)], legs: [] });
    const text = w.find('[data-test="totals"]').text();
    expect(text).toBe('Add another stop or a homebase to see the route');
    expect(text).not.toContain('km');
  });

  it('shows routing… while loading', () => {
    const w = make({ loading: true });
    expect(w.find('[data-test="totals"]').text()).toBe('routing…');
  });

  describe('calculate route', () => {
    it('prompts to calculate when not calculated', async () => {
      const w = make({ calculated: false, legs: [] });
      const btn = w.find('[data-test="calculate"]');
      expect(btn.text()).toBe('Calculate route');
      expect(btn.attributes('disabled')).toBeUndefined();
      expect(w.find('[data-test="totals"]').text()).toBe('Route not calculated');
      expect(w.find('[data-test="leg"]').exists()).toBe(false);
      await btn.trigger('click');
      expect(w.emitted('calculate')).toHaveLength(1);
    });

    it('offers a recalculation when stale', () => {
      const w = make({ calculated: false, stale: true, legs: [] });
      expect(w.find('[data-test="calculate"]').text()).toBe('Recalculate route');
      expect(w.find('[data-test="totals"]').text()).toBe('Route out of date');
    });

    it('disables the button while loading', () => {
      const w = make({ calculated: false, loading: true, legs: [] });
      const btn = w.find('[data-test="calculate"]');
      expect(btn.text()).toBe('Routing…');
      expect(btn.attributes('disabled')).toBeDefined();
    });

    it('hides the button once calculated', () => {
      const w = make();
      expect(w.find('[data-test="calculate"]').exists()).toBe(false);
      expect(w.find('[data-test="totals"]').text()).toBe('212 km · ~3 h');
    });

    it('disables the button with fewer than 2 stops', () => {
      const w = make({ stops: [eventStop(A)], calculated: false, legs: [] });
      const btn = w.find('[data-test="calculate"]');
      expect(btn.attributes('disabled')).toBeDefined();
      expect(btn.attributes('title')).toBe('Add another stop or a homebase');
    });
  });

  it('shows conflicts on the later stop', () => {
    const overlap: Conflict[] = [{ a: 'e1', b: 'e2', reason: 'overlap' }];
    const w = make({ conflicts: overlap });
    const stops = w.findAll('[data-test="stop"]');
    expect(stops[0].find('[data-test="conflict"]').exists()).toBe(false);
    expect(stops[1].find('[data-test="conflict"]').text()).toContain(
      'Overlaps with Nendaz Freeride',
    );
    const tight = make({ conflicts: [{ a: 'e1', b: 'e2', reason: 'tight' }] });
    expect(tight.find('[data-test="conflict"]').text()).toContain('Tight: not enough travel days');
  });

  it('emits remove, select, clear and set-home', async () => {
    const w = make();
    expect(w.findAll('[data-test="remove"]')[1].attributes('aria-label')).toBe(
      'Remove Verbier Pro',
    );
    await w.findAll('[data-test="remove"]')[1].trigger('click');
    expect(w.emitted('remove')![0]).toEqual(['e2']);
    await w.findAll('[data-test="select"]')[0].trigger('click');
    expect(w.emitted('select')![0]).toEqual(['e1']);
    await w.find('[data-test="clear"]').trigger('click');
    expect(w.emitted('clear')).toHaveLength(1);
    await w.find('[data-test="set-home"]').trigger('click');
    expect(w.emitted('set-home')).toHaveLength(1);
  });

  it('labels the homebase button by state', () => {
    expect(make().find('[data-test="set-home"]').text()).toBe('Set homebase');
    expect(make({ home }).find('[data-test="set-home"]').text()).toBe('Change homebase');
  });

  it('disables option checkboxes without home', () => {
    const w = make();
    expect(w.find('[data-test="start-home"]').attributes('disabled')).toBeDefined();
    expect(w.find('[data-test="return-home"]').attributes('disabled')).toBeDefined();
  });

  it('emits update:options with a new object when toggled', async () => {
    const w = make({ home });
    await w.find('[data-test="start-home"]').setValue(true);
    expect(w.emitted('update:options')![0]).toEqual([{ ...opts, startAtHome: true }]);
    await w.find('[data-test="return-home"]').setValue(true);
    expect(w.emitted('update:options')![1]).toEqual([{ ...opts, returnHome: true }]);
    expect(w.emitted('update:options')![0][0]).not.toBe(opts);
  });

  describe('home trips', () => {
    const viaStop: Stop = {
      kind: 'home',
      role: 'via',
      after: 'e1',
      lat: 47,
      lng: 8,
      label: 'Zurich',
    };
    const C = ev({ id: 'e3', name: 'Chamonix', start: '2026-03-10', end: '2026-03-11' });

    it('shows one toggle per event pair', () => {
      expect(make().findAll('[data-test="home-trip"]')).toHaveLength(1);
      const w = make({ stops: [eventStop(A), eventStop(B), eventStop(C)], legs: [] });
      expect(w.findAll('[data-test="home-trip"]')).toHaveLength(2);
      expect(
        make({ stops: [eventStop(A)], legs: [] })
          .find('[data-test="home-trip"]')
          .exists(),
      ).toBe(false);
    });

    it('reflects auto and override pressed state', () => {
      const far = { stops: [eventStop(A), eventStop(C)], legs: [], home };
      const auto = make(far).find('[data-test="home-trip"]');
      expect(auto.attributes('aria-pressed')).toBe('true');
      expect(auto.text()).toContain('(auto)');
      const off = make({ ...far, options: { ...opts, homeTrips: { e1: false } } }).find(
        '[data-test="home-trip"]',
      );
      expect(off.attributes('aria-pressed')).toBe('false');
      expect(off.text()).not.toContain('(auto)');
      const near = make({ home }).find('[data-test="home-trip"]');
      expect(near.attributes('aria-pressed')).toBe('false');
    });

    it('emits a new homeTrips override when toggled', async () => {
      const w = make({ home });
      await w.find('[data-test="home-trip"]').trigger('click');
      const out = w.emitted('update:options')![0][0] as PlanOptions;
      expect(out.homeTrips).toEqual({ e1: true });
      expect(opts.homeTrips).toEqual({});
    });

    it('disables the toggle without home', () => {
      const btn = make().find('[data-test="home-trip"]');
      expect(btn.attributes('disabled')).toBeDefined();
      expect(btn.attributes('title')).toBe('Set a homebase first');
    });

    it('renders a via stop with the days at home', () => {
      const w = make({
        stops: [eventStop(A), viaStop, eventStop(C)],
        legs: [],
        home,
      });
      const stops = w.findAll('[data-test="stop"]');
      expect(stops[1].text()).toContain('🏠 Zurich');
      expect(stops[1].find('[data-test="via-gap"]').text()).toBe('14 days at home');
      expect(w.findAll('[data-test="home-trip"]')).toHaveLength(1);
    });

    it('emits a clamped integer homeGapDays', async () => {
      const w = make({ home });
      const input = w.find('[data-test="home-gap"]');
      await input.setValue('100');
      expect((w.emitted('update:options')![0][0] as PlanOptions).homeGapDays).toBe(60);
      await input.setValue('0');
      expect((w.emitted('update:options')![1][0] as PlanOptions).homeGapDays).toBe(1);
      await input.setValue('7.4');
      expect((w.emitted('update:options')![2][0] as PlanOptions).homeGapDays).toBe(7);
      await input.setValue('');
      expect(w.emitted('update:options')).toHaveLength(3);
    });
  });
});
