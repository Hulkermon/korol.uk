import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EventDetail from '@/components/Freeride/EventDetail.vue';
import type { FreerideEvent } from '@/composables/freeride/types';

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
    registrationMode: 'waitlist',
    price: { amountCents: 12500, currency: 'EUR' },
    url: 'https://liveheats.com/events/e1',
    registerUrl: 'https://liveheats.com/events/e1/registration',
    divisions: [
      {
        name: 'Ski Men',
        entryCount: 2,
        riders: [
          { name: 'A Rider', nationality: 'CH', status: 'confirmed' },
          { name: 'B Rider', nationality: 'FR', status: 'waitlisted' },
        ],
      },
    ],
    ...overrides,
  };
}

function render(event: FreerideEvent, planned = false) {
  return mount(EventDetail, { props: { event, planned, planning: false } });
}

describe('EventDetail', () => {
  it('formats same-month, cross-month and single-day ranges', () => {
    expect(render(makeEvent()).find('.fr-dates').text()).toBe('22–24 Feb 2027');
    expect(
      render(makeEvent({ start: '2027-02-28', end: '2027-03-02' }))
        .find('.fr-dates')
        .text(),
    ).toBe('28 Feb – 2 Mar 2027');
    expect(
      render(makeEvent({ start: '2027-02-22', end: '2027-02-22' }))
        .find('.fr-dates')
        .text(),
    ).toBe('22 Feb 2027');
  });

  it('shows badge with stars', () => {
    expect(render(makeEvent()).find('.fr-badge').text()).toBe('FWQ ★★☆☆');
    expect(
      render(makeEvent({ tier: 'pro', stars: null }))
        .find('.fr-badge')
        .text(),
    ).toBe('PRO');
  });

  it('formats price and null price', () => {
    expect(render(makeEvent()).find('.fr-price').text()).toBe('€125.00');
    expect(
      render(makeEvent({ price: null }))
        .find('.fr-price')
        .text(),
    ).toBe('Price not listed');
  });

  it('labels registration modes', () => {
    expect(render(makeEvent()).find('.fr-registration').text()).toBe('Waitlist registration');
    expect(
      render(makeEvent({ registrationMode: 'open' }))
        .find('.fr-registration')
        .text(),
    ).toBe('Registration open');
    expect(
      render(makeEvent({ registrationMode: null }))
        .find('.fr-registration')
        .text(),
    ).toBe('Registration info on Liveheats');
    expect(
      render(makeEvent({ registrationMode: 'invite' }))
        .find('.fr-registration')
        .text(),
    ).toBe('invite');
  });

  it('renders both links', () => {
    const w = render(makeEvent());
    const ev = w.find('.fr-link-event');
    const reg = w.find('.fr-link-register');
    expect(ev.text()).toBe('Event on Liveheats');
    expect(ev.attributes('href')).toBe('https://liveheats.com/events/e1');
    expect(ev.attributes('target')).toBe('_blank');
    expect(ev.attributes('rel')).toBe('noopener');
    expect(reg.text()).toBe('Sign up');
    expect(reg.attributes('href')).toBe('https://liveheats.com/events/e1/registration');
  });

  it('renders division sections with counts and status pills', () => {
    const w = render(makeEvent());
    expect(w.find('.fr-division summary').text()).toBe('Ski Men (2)');
    const pills = w.findAll('.fr-pill');
    expect(pills.map((p) => p.text())).toEqual(['confirmed', 'waitlisted']);
    expect(pills[0].classes()).toContain('fr-pill-confirmed');
    expect(pills[1].classes()).toContain('fr-pill-waitlisted');
    expect(w.text()).toContain('A Rider');
    expect(w.text()).toContain('FR');
  });

  it('shows raw unknown status', () => {
    const w = render(
      makeEvent({
        divisions: [
          { name: 'X', entryCount: 1, riders: [{ name: 'R', nationality: null, status: 'odd' }] },
        ],
      }),
    );
    expect(w.find('.fr-pill').text()).toBe('odd');
    expect(w.find('.fr-pill').classes()).toContain('fr-pill-other');
  });

  it('shows hidden-entries and no-divisions messages', () => {
    const hidden = render(
      makeEvent({ divisions: [{ name: 'Ski Women', entryCount: 5, riders: [] }] }),
    );
    expect(hidden.text()).toContain('Entry list hidden by organiser');
    expect(render(makeEvent({ divisions: [] })).text()).toContain('No divisions published yet');
  });

  it('emits toggle-plan and close', async () => {
    const w = render(makeEvent());
    await w.find('.fr-plan').trigger('click');
    expect(w.emitted('toggle-plan')![0]).toEqual(['e1']);
    await w.find('button[aria-label="Close"]').trigger('click');
    expect(w.emitted('close')).toHaveLength(1);
  });

  it('changes button label with planned', () => {
    expect(render(makeEvent(), false).find('.fr-plan').text()).toBe('Add to plan');
    expect(render(makeEvent(), true).find('.fr-plan').text()).toBe('Remove from plan');
  });

  it('renders a flag image for a known nationality', () => {
    const w = render(
      makeEvent({
        divisions: [
          {
            name: 'X',
            entryCount: 1,
            riders: [{ name: 'R', nationality: 'Sweden', status: 'confirmed' }],
          },
        ],
      }),
    );
    const img = w.find('img.fr-flag');
    expect(img.exists()).toBe(true);
    expect(img.attributes('title')).toBe('Sweden');
    expect(img.attributes('alt')).toBe('Sweden');
    expect(img.attributes('src')).toBeTruthy();
    expect(w.find('.fr-rider-nat').exists()).toBe(false);
  });

  it('renders an off star for every rider by default', () => {
    const stars = render(makeEvent()).findAll('.fr-star');
    expect(stars).toHaveLength(2);
    for (const s of stars) {
      expect(s.classes()).not.toContain('on');
      expect(s.attributes('aria-pressed')).toBe('false');
      expect(s.text()).toBe('☆');
    }
  });

  it('emits toggle-homie with the rider name', async () => {
    const w = render(makeEvent());
    await w.findAll('.fr-star')[1].trigger('click');
    expect(w.emitted('toggle-homie')![0]).toEqual(['B Rider', undefined]);
  });

  it('emits toggle-homie with name and athleteId', async () => {
    const event = makeEvent({
      divisions: [
        {
          name: 'Ski Men',
          entryCount: 1,
          riders: [{ name: 'A Rider', athleteId: '777', nationality: 'CH', status: 'confirmed' }],
        },
      ],
    });
    const w = mount(EventDetail, {
      props: { event, planned: false, planning: false, homieKeys: ['777'] },
    });
    expect(w.find('.fr-star').classes()).toContain('on');
    await w.find('.fr-star').trigger('click');
    expect(w.emitted('toggle-homie')![0]).toEqual(['A Rider', '777']);
  });

  it('bolds homies and marks their star on', () => {
    const w = mount(EventDetail, {
      props: { event: makeEvent(), planned: false, planning: false, homieKeys: ['a rider'] },
    });
    const names = w.findAll('.fr-rider-name');
    const stars = w.findAll('.fr-star');
    expect(names[0].classes()).toContain('fr-rider-name--homie');
    expect(stars[0].classes()).toContain('on');
    expect(stars[0].attributes('aria-pressed')).toBe('true');
    expect(stars[0].text()).toBe('★');
    expect(names[1].classes()).not.toContain('fr-rider-name--homie');
    expect(stars[1].classes()).not.toContain('on');
  });

  it('falls back to text for unknown nationality and renders nothing for null', () => {
    const unknown = render(
      makeEvent({
        divisions: [
          {
            name: 'X',
            entryCount: 1,
            riders: [{ name: 'R', nationality: 'Atlantis', status: 'confirmed' }],
          },
        ],
      }),
    );
    expect(unknown.find('img.fr-flag').exists()).toBe(false);
    expect(unknown.find('.fr-rider-nat').text()).toBe('Atlantis');

    const none = render(
      makeEvent({
        divisions: [
          {
            name: 'X',
            entryCount: 1,
            riders: [{ name: 'R', nationality: null, status: 'confirmed' }],
          },
        ],
      }),
    );
    expect(none.find('img.fr-flag').exists()).toBe(false);
    expect(none.find('.fr-rider-nat').exists()).toBe(false);
  });
});
