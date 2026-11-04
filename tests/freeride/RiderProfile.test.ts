import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RiderProfile from '@/components/Freeride/RiderProfile.vue';
import type { RiderProfileData, ProfileEntry } from '@/composables/freeride/riders';
import type { FreerideEvent, RiderRanking } from '@/composables/freeride/types';

function makeEvent(overrides: Partial<FreerideEvent> = {}): FreerideEvent {
  return {
    id: 'e1',
    name: 'Test Open',
    tier: 'qualifier',
    stars: 2,
    start: '2027-02-22',
    end: '2027-02-24',
    place: 'Nendaz, Switzerland',
    countryCode: 'CH',
    lat: 46,
    lng: 7,
    status: 'upcoming',
    registrationMode: 'open',
    price: null,
    url: 'u',
    registerUrl: 'r',
    divisions: [],
    ...overrides,
  };
}

function makeRanking(overrides: Partial<RiderRanking> = {}): RiderRanking {
  return {
    seriesId: 's1',
    series: 'FWT Pro',
    tier: 'pro',
    division: 'Ski Men',
    place: 3,
    points: 4200,
    results: [],
    ...overrides,
  };
}

function makeProfile(overrides: Partial<RiderProfileData> = {}): RiderProfileData {
  return {
    id: 'a1',
    name: 'Ada Lovelace',
    nationality: 'CH',
    image: null,
    ranking: null,
    rankings: [],
    entries: [],
    otherResults: [],
    ...overrides,
  };
}

function render(profile: RiderProfileData, homie = false) {
  return mount(RiderProfile, { props: { profile, homie } });
}

describe('RiderProfile', () => {
  it('shows name and photo when present', () => {
    const w = render(makeProfile({ image: 'https://x/a.jpg' }));
    expect(w.text()).toContain('Ada Lovelace');
    expect(w.find('img.fr-photo').attributes('src')).toBe('https://x/a.jpg');
  });

  it('falls back to initials without a photo', () => {
    const w = render(makeProfile());
    expect(w.find('img.fr-photo').exists()).toBe(false);
    expect(w.find('.fr-initials').text()).toBe('AL');
  });

  it('shows the points card with a ranking', () => {
    const ranking = makeRanking();
    const w = render(makeProfile({ ranking, rankings: [ranking] }));
    const card = w.find('.fr-points').text();
    expect(card).toContain('4,200 pts');
    expect(card).toContain('#3');
    expect(card).toContain('FWT Pro');
    expect(card).toContain('Ski Men');
  });

  it('shows "Not ranked yet" without a ranking', () => {
    const w = render(makeProfile());
    expect(w.find('.fr-points').text()).toBe('Not ranked yet');
  });

  it('lists other rankings besides the primary one', () => {
    const primary = makeRanking();
    const other = makeRanking({ series: 'FWQ Europe', tier: 'qualifier', place: 9, points: 800 });
    const w = render(makeProfile({ ranking: primary, rankings: [primary, other] }));
    const items = w.findAll('.fr-others li');
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain('FWQ Europe');
  });

  it('shows the status pill for upcoming events', () => {
    const entry: ProfileEntry = {
      event: makeEvent(),
      division: 'Ski Men',
      status: 'confirmed',
      result: null,
    };
    const w = render(makeProfile({ entries: [entry] }));
    expect(w.find('.fr-pill-confirmed').text()).toBe('confirmed');
    expect(w.find('.fr-result').exists()).toBe(false);
    expect(w.text()).toContain('Test Open');
    expect(w.text()).toContain('22–24 Feb');
  });

  it('shows the result for finished events and marks dropped ones', () => {
    const event = makeEvent({ id: 'e2', name: 'Done Open', status: 'finished' });
    const entries: ProfileEntry[] = [
      {
        event,
        division: 'Ski Men',
        status: 'confirmed',
        result: { place: 2, points: 720, dropped: false },
      },
      {
        event: makeEvent({ id: 'e3', name: 'Dropped Open', status: 'finished' }),
        division: 'Ski Men',
        status: 'confirmed',
        result: { place: 8, points: 100, dropped: true },
      },
    ];
    const w = render(makeProfile({ entries }));
    expect(w.find('.fr-pill').exists()).toBe(false);
    const results = w.findAll('.fr-result');
    expect(results[0].text()).toContain('#2 · 720 pts');
    expect(results[0].classes()).not.toContain('dropped');
    expect(results[1].classes()).toContain('dropped');
    expect(results[1].text()).toContain('dropped');
  });

  it('shows an empty state with no entries', () => {
    const w = render(makeProfile());
    expect(w.find('.fr-empty').exists()).toBe(true);
  });

  it('shows other ranked results only when present', () => {
    expect(render(makeProfile()).text()).not.toContain('Other ranked results');
    const w = render(
      makeProfile({
        otherResults: [
          {
            eventId: 'x',
            eventName: 'Verbier Xtreme',
            date: '2027-03-20',
            place: 4,
            points: 500,
            dropped: true,
            series: 'FWT Pro',
          },
        ],
      }),
    );
    expect(w.text()).toContain('Other ranked results');
    expect(w.text()).toContain('Verbier Xtreme');
    expect(w.text()).toContain('#4 · 500 pts');
    expect(w.find('.fr-other-results .fr-result').classes()).toContain('dropped');
  });

  it('emits open-event with the event id', async () => {
    const entry: ProfileEntry = {
      event: makeEvent({ id: 'evt-9' }),
      division: 'Ski Men',
      status: 'confirmed',
      result: null,
    };
    const w = render(makeProfile({ entries: [entry] }));
    await w.find('.fr-entry-name').trigger('click');
    expect(w.emitted('open-event')).toEqual([['evt-9']]);
  });

  it('emits toggle-homie and reflects homie state', async () => {
    const w = render(makeProfile(), true);
    const star = w.find('.fr-star');
    expect(star.text()).toBe('★');
    expect(star.attributes('aria-label')).toBe('Remove Ada Lovelace from homies');
    await star.trigger('click');
    expect(w.emitted('toggle-homie')).toHaveLength(1);
    await w.setProps({ homie: false });
    expect(w.find('.fr-star').text()).toBe('☆');
  });
});
