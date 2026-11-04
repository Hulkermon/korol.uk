import { describe, it, expect } from 'vitest';
import { mount, RouterLinkStub } from '@vue/test-utils';
import HomiesPanel from '@/components/Freeride/HomiesPanel.vue';
import type { Homie } from '@/composables/freeride/homies';
import type { Athlete, FreerideEvent } from '@/composables/freeride/types';

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

const rider = (name: string, status = 'confirmed', nationality: string | null = 'Switzerland') =>
  ({ name, status, nationality }) as FreerideEvent['divisions'][number]['riders'][number];

const LATE = ev({
  id: 'late',
  name: 'Verbier Pro',
  tier: 'pro',
  start: '2026-03-20',
  end: '2026-03-22',
  divisions: [
    {
      name: 'Men Ski',
      entryCount: 2,
      riders: [rider('Ann Lee', 'waitlisted'), rider('Bob Ray')],
      results: [],
    },
  ],
});
const EARLY = ev({
  id: 'early',
  divisions: [
    {
      name: 'Women Ski',
      entryCount: 2,
      riders: [rider('Ann Lee', 'confirmed'), rider('Zoë Moxon', 'weird', 'Atlantis')],
      results: [],
    },
    {
      name: 'Women Snowboard',
      entryCount: 1,
      riders: [rider('Ann Lee', 'denied')],
      results: [],
    },
  ],
});
const events = [LATE, EARLY];
const ANN: Homie = { key: 'ann lee', name: 'Ann Lee' };
const BOB: Homie = { key: 'bob ray', name: 'Bob Ray' };
const NONE: Homie = { key: 'nobody', name: 'Nobody' };

function make(props: Record<string, unknown> = {}) {
  return mount(HomiesPanel, {
    props: { homies: [], events, focusedKey: null, ...props },
    global: { stubs: { NuxtLink: RouterLinkStub } },
  });
}

describe('HomiesPanel list view', () => {
  it('shows the empty state with no homies', () => {
    const w = make();
    expect(w.find('.fr-homies-empty').text()).toContain('No homies yet.');
    expect(w.find('.fr-homies-search').exists()).toBe(true);
  });

  it('lists rows with counts and plural text', () => {
    const w = make({ homies: [ANN, NONE, { key: 'zoe moxon', name: 'Zoë Moxon' }] });
    const rows = w.findAll('.fr-homie');
    expect(rows).toHaveLength(3);
    expect(rows[0].text()).toContain('2 events');
    expect(rows[1].text()).toContain('Not signed up yet');
    expect(rows[2].text()).toContain('1 event');
    expect(rows[2].text()).not.toContain('1 events');
  });

  it('emits focus when a row is clicked', async () => {
    const w = make({ homies: [ANN] });
    await w.find('.fr-homie-open').trigger('click');
    expect(w.emitted('focus')![0]).toEqual(['ann lee']);
  });

  it('emits toggle-homie from the star', async () => {
    const w = make({ homies: [ANN] });
    const star = w.find('.fr-star.on');
    expect(star.attributes('aria-label')).toBe('Remove Ann Lee from homies');
    await star.trigger('click');
    expect(w.emitted('toggle-homie')![0]).toEqual(['Ann Lee']);
  });

  it('filters homie rows by the query', async () => {
    const w = make({ homies: [ANN, BOB] });
    await w.find('.fr-homies-search').setValue('bob');
    const rows = w.findAll('.fr-homie');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Bob Ray');
    await w.find('.fr-homies-search').setValue('qq');
    expect(w.text()).toContain('No homies match');
  });

  it('lists matching non-homies under Other riders', async () => {
    const w = make({ homies: [ANN] });
    await w.find('.fr-homies-search').setValue('a');
    expect(w.text()).not.toContain('Other riders');
    await w.find('.fr-homies-search').setValue('ee');
    expect(w.text()).toContain('Other riders');
    expect(w.findAll('.fr-rider-result')).toHaveLength(0);
    expect(w.text()).toContain('No riders match');
    await w.find('.fr-homies-search').setValue('bo');
    const results = w.findAll('.fr-rider-result');
    expect(results).toHaveLength(1);
    expect(results[0].text()).toContain('Bob Ray');
    expect(results[0].find('.fr-star').classes()).not.toContain('on');
    expect(results[0].find('.fr-star').text()).toBe('☆');
    expect(results[0].find('img.fr-flag').exists()).toBe(true);
  });

  it('shows a text fallback for unknown countries', async () => {
    const w = make();
    await w.find('.fr-homies-search').setValue('zoe');
    expect(w.find('.fr-rider-result .fr-rider-nat').text()).toBe('Atlantis');
  });

  it('emits toggle-homie and focus from a result', async () => {
    const w = make();
    await w.find('.fr-homies-search').setValue('bob');
    const result = w.find('.fr-rider-result');
    expect(result.find('.fr-star').attributes('aria-label')).toBe('Add Bob Ray to homies');
    await result.find('.fr-star').trigger('click');
    expect(w.emitted('toggle-homie')![0]).toEqual(['Bob Ray']);
    await result.find('.fr-homie-open').trigger('click');
    expect(w.emitted('focus')![0]).toEqual(['bob ray']);
  });

  it('falls back to the list for an unknown focusedKey', () => {
    const w = make({ homies: [ANN], focusedKey: 'ghost' });
    expect(w.find('.fr-homies-back').exists()).toBe(false);
    expect(w.find('.fr-homie').exists()).toBe(true);
  });
});

describe('HomiesPanel focused view', () => {
  it('lists entries in date order with division and status pill', () => {
    const w = make({ homies: [ANN], focusedKey: 'ann lee' });
    expect(w.find('h2').text()).toBe('Ann Lee');
    const entries = w.findAll('.fr-entry');
    expect(entries).toHaveLength(3);
    expect(entries[0].text()).toContain('22–24 Feb');
    expect(entries[0].text()).toContain('Nendaz Freeride');
    expect(entries[0].text()).toContain('Women Ski');
    expect(entries[0].find('.fr-pill').classes()).toContain('fr-pill-confirmed');
    expect(entries[1].find('.fr-pill').classes()).toContain('fr-pill-denied');
    expect(entries[2].text()).toContain('20–22 Mar');
    expect(entries[2].find('.fr-pill').classes()).toContain('fr-pill-waitlisted');
  });

  it('uses the other pill class for unknown statuses', () => {
    const w = make({ focusedKey: 'zoe moxon' });
    expect(w.find('.fr-pill').classes()).toContain('fr-pill-other');
  });

  it('emits select when an entry is clicked', async () => {
    const w = make({ homies: [ANN], focusedKey: 'ann lee' });
    await w.findAll('.fr-entry')[2].trigger('click');
    expect(w.emitted('select')![0]).toEqual(['late']);
  });

  it('emits focus(null) from back', async () => {
    const w = make({ homies: [ANN], focusedKey: 'ann lee' });
    await w.find('.fr-homies-back').trigger('click');
    expect(w.emitted('focus')![0]).toEqual([null]);
  });

  it('shows a gold star for a homie and toggles', async () => {
    const w = make({ homies: [ANN], focusedKey: 'ann lee' });
    const star = w.find('.fr-homies-head .fr-star');
    expect(star.classes()).toContain('on');
    expect(star.attributes('aria-label')).toBe('Remove Ann Lee from homies');
    await star.trigger('click');
    expect(w.emitted('toggle-homie')![0]).toEqual(['Ann Lee']);
  });

  it('shows an off star for a focused non-homie', () => {
    const w = make({ focusedKey: 'bob ray' });
    const star = w.find('.fr-homies-head .fr-star');
    expect(star.classes()).not.toContain('on');
    expect(star.text()).toBe('☆');
    expect(star.attributes('aria-label')).toBe('Add Bob Ray to homies');
  });

  it('shows a message when there are no entries', () => {
    const w = make({ homies: [NONE], focusedKey: 'nobody' });
    expect(w.text()).toContain('Not signed up to any events in this snapshot');
  });
});

const athletes: Record<string, Athlete> = {
  '123': {
    id: '123',
    name: 'Ann Lee',
    nationality: 'Switzerland',
    image: null,
    rankings: [
      {
        series: 'FWT',
        tier: 'pro',
        place: 3,
        points: 5100,
        results: [],
      } as unknown as Athlete['rankings'][number],
    ],
  },
};
const ANN_ID: Homie = { key: '123', name: 'Ann Lee' };

describe('HomiesPanel points and profiles', () => {
  it('shows points in homie rows and omits them when unranked', () => {
    const w = make({ homies: [ANN_ID, NONE], athletes });
    const rows = w.findAll('.fr-homie');
    expect(rows[0].find('.fr-homie-points').text()).toBe('5,100 pts · #3');
    expect(rows[1].find('.fr-homie-points').exists()).toBe(false);
  });

  it('shows points on search results', async () => {
    const w = make({ athletes: { ...athletes, 'bob ray': athletes['123'] } });
    await w.find('.fr-homies-search').setValue('bob');
    expect(w.find('.fr-rider-result .fr-homie-points').text()).toBe('5,100 pts · #3');
  });

  it('links to the profile only for id keys', () => {
    const withId = make({ homies: [ANN_ID], focusedKey: '123', athletes });
    const link = withId.findComponent(RouterLinkStub);
    expect(link.props('to')).toBe('/freeride/rider/123');
    expect(link.text()).toContain('View profile');
    const byName = make({ homies: [ANN], focusedKey: 'ann lee' });
    expect(byName.findComponent(RouterLinkStub).exists()).toBe(false);
  });

  it('shows the result instead of the pill for finished events', () => {
    const done = ev({
      id: 'done',
      status: 'finished',
      divisions: [
        {
          name: 'Women Ski',
          entryCount: 2,
          riders: [{ ...rider('Ann Lee'), athleteId: '123' } as never],
          results: [
            { place: 2, athleteId: '123', name: 'Ann Lee', nationality: null, points: 400 },
            { place: 5, athleteId: '999', name: 'Other', nationality: null, points: null },
          ],
        },
      ],
    });
    const w = make({ homies: [ANN_ID], events: [done], focusedKey: '123', athletes });
    const entry = w.find('.fr-entry');
    expect(entry.find('.fr-entry-result').text()).toBe('#2 · 400 pts');
    expect(entry.find('.fr-pill').exists()).toBe(false);
  });

  it('shows only the place when points are null', () => {
    const done = ev({
      id: 'done',
      status: 'finished',
      divisions: [
        {
          name: 'Women Ski',
          entryCount: 1,
          riders: [{ ...rider('Ann Lee'), athleteId: '123' } as never],
          results: [
            { place: 4, athleteId: '123', name: 'Ann Lee', nationality: null, points: null },
          ],
        },
      ],
    });
    const w = make({ homies: [ANN_ID], events: [done], focusedKey: '123' });
    expect(w.find('.fr-entry-result').text()).toBe('#4');
  });
});
