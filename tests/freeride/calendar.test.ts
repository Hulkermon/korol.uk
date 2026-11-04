import { describe, expect, it } from 'vitest';
import {
  agendaGroups,
  calendarEvents,
  initialMonth,
  monthGrid,
  monthLabel,
  seasonMonths,
} from '@/composables/freeride/calendar';
import type { CalendarFilter } from '@/composables/freeride/calendar';
import { DEFAULT_LEGEND } from '@/composables/freeride/filters';
import type { FreerideEvent } from '@/composables/freeride/types';

function ev(p: Partial<FreerideEvent>): FreerideEvent {
  return {
    id: 'x',
    name: 'X',
    tier: 'pro',
    stars: null,
    start: '2027-01-10',
    end: '2027-01-12',
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

function withRider(r: { athleteId: string | null; name: string }, p: Partial<FreerideEvent>) {
  return ev({
    ...p,
    divisions: [
      {
        name: 'Ski Men',
        entryCount: 1,
        riders: [{ ...r, nationality: null, status: 'confirmed' }],
        results: [],
      },
    ],
  } as Partial<FreerideEvent>);
}

const base: CalendarFilter = { legend: DEFAULT_LEGEND, onlyPlan: false, onlyHomies: false };

describe('calendarEvents', () => {
  const a = withRider(
    { athleteId: '42', name: 'Ann Lee' },
    { id: 'a', name: 'B', start: '2027-01-05' },
  );
  const b = withRider(
    { athleteId: null, name: 'Bob Ray' },
    { id: 'b', name: 'A', start: '2027-01-05' },
  );
  const j = ev({ id: 'j', name: 'Junior', tier: 'junior', start: '2027-01-01' });
  const all = [a, b, j];

  it('applies the legend and sorts by start then name', () => {
    expect(calendarEvents(all, base, [], []).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('onlyPlan keeps planned events', () => {
    expect(calendarEvents(all, { ...base, onlyPlan: true }, ['a'], []).map((e) => e.id)).toEqual([
      'a',
    ]);
  });

  it('onlyHomies matches by athleteId and by name fallback', () => {
    const f = { ...base, onlyHomies: true };
    expect(calendarEvents(all, f, [], ['42']).map((e) => e.id)).toEqual(['a']);
    expect(calendarEvents([b], f, [], ['42'])).toEqual([]);
  });

  it('onlyHomies by name fallback uses riderId', async () => {
    const { riderId } = await import('@/composables/freeride/homies');
    const k = riderId({ athleteId: null, name: 'Bob Ray' });
    const f = { ...base, onlyHomies: true };
    expect(calendarEvents(all, f, [], [k]).map((e) => e.id)).toEqual(['b']);
  });

  it('combines onlyPlan and onlyHomies', () => {
    const f = { ...base, onlyPlan: true, onlyHomies: true };
    expect(calendarEvents(all, f, ['a', 'b'], ['42']).map((e) => e.id)).toEqual(['a']);
    expect(calendarEvents(all, f, ['b'], ['42'])).toEqual([]);
  });
});

describe('season months', () => {
  it('spans a year boundary', () => {
    expect(seasonMonths({ from: '2026-11-20', to: '2027-02-03' })).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('initialMonth picks current, first or last', () => {
    const months = ['2026-12', '2027-01', '2027-02'];
    expect(initialMonth(months, '2027-01-15')).toBe('2027-01');
    expect(initialMonth(months, '2026-06-01')).toBe('2026-12');
    expect(initialMonth(months, '2027-08-01')).toBe('2027-02');
  });

  it('initialMonth skips to the first event month before it', () => {
    const months = ['2026-12', '2027-01', '2027-02'];
    expect(initialMonth(months, '2026-11-04', '2027-01-09')).toBe('2027-01');
    expect(initialMonth(months, '2026-12-20', '2027-01-09')).toBe('2027-01');
    expect(initialMonth(months, '2027-02-03', '2027-01-09')).toBe('2027-02');
    expect(initialMonth(months, '2026-11-04', '2027-05-01')).toBe('2026-12');
  });

  it('monthLabel', () => {
    expect(monthLabel('2026-12')).toBe('December 2026');
  });
});

describe('monthGrid', () => {
  it('month starting on Monday (Feb 2027) has 4 full weeks', () => {
    const weeks = monthGrid('2027-02', []);
    expect(weeks).toHaveLength(4);
    expect(weeks[0].days[0]).toEqual({ date: '2027-02-01', day: 1, inMonth: true });
    expect(weeks[3].days[6].date).toBe('2027-02-28');
    expect(weeks.every((w) => w.days.every((d) => d.inMonth))).toBe(true);
    expect(weeks[0].lanes).toBe(0);
  });

  it('month starting on Sunday (Nov 2026) has leading and trailing days', () => {
    const weeks = monthGrid('2026-11', []);
    expect(weeks).toHaveLength(6);
    expect(weeks[0].days[0]).toEqual({ date: '2026-10-26', day: 26, inMonth: false });
    expect(weeks[0].days[5].inMonth).toBe(false);
    expect(weeks[0].days[6]).toEqual({ date: '2026-11-01', day: 1, inMonth: true });
    expect(weeks[5].days[0].date).toBe('2026-11-30');
    expect(weeks[5].days[1].inMonth).toBe(false);
    expect(weeks[5].days[6].date).toBe('2026-12-06');
  });

  it('splits a multi-week event into clipped bars', () => {
    // Jan 2027: Jan 1 is Friday; weeks start Dec 28, Jan 4, 11...
    const e = ev({ id: 'm', start: '2027-01-08', end: '2027-01-12' });
    const weeks = monthGrid('2027-01', [e]);
    expect(weeks[1].bars).toEqual([
      { event: e, col: 4, span: 3, lane: 0, contLeft: false, contRight: true },
    ]);
    expect(weeks[2].bars).toEqual([
      { event: e, col: 0, span: 2, lane: 0, contLeft: true, contRight: false },
    ]);
    expect(weeks[0].bars).toEqual([]);
    expect(weeks[3].bars).toEqual([]);
  });

  it('clips an event starting in the previous month', () => {
    const e = ev({ id: 'p', start: '2026-12-20', end: '2027-01-05' });
    const weeks = monthGrid('2027-01', [e]);
    expect(weeks[0].bars).toHaveLength(1);
    expect(weeks[0].bars[0]).toMatchObject({ col: 0, span: 7, contLeft: true, contRight: true });
    expect(weeks[1].bars[0]).toMatchObject({ col: 0, span: 2, contLeft: true, contRight: false });
  });

  it('puts overlapping events in different lanes and reuses lane 0', () => {
    const a = ev({ id: 'a', name: 'A', start: '2027-02-02', end: '2027-02-04' });
    const b = ev({ id: 'b', name: 'B', start: '2027-02-03', end: '2027-02-03' });
    const c = ev({ id: 'c', name: 'C', start: '2027-02-05', end: '2027-02-06' });
    const week = monthGrid('2027-02', [a, b, c])[0];
    const lane = (id: string) => week.bars.find((x) => x.event.id === id)!.lane;
    expect(lane('a')).toBe(0);
    expect(lane('b')).toBe(1);
    expect(lane('c')).toBe(0);
    expect(week.lanes).toBe(2);
  });
});

describe('agendaGroups', () => {
  it('groups by start month chronologically', () => {
    const groups = agendaGroups([
      ev({ id: 'c', name: 'C', start: '2027-02-01', end: '2027-02-02' }),
      ev({ id: 'b', name: 'B', start: '2026-12-30', end: '2027-01-02' }),
      ev({ id: 'a', name: 'A', start: '2026-12-05', end: '2026-12-06' }),
    ]);
    expect(groups.map((g) => g.month)).toEqual(['2026-12', '2027-02']);
    expect(groups.map((g) => g.label)).toEqual(['December 2026', 'February 2027']);
    expect(groups[0].events.map((e) => e.id)).toEqual(['a', 'b']);
  });
});
