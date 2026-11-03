import { describe, expect, it, vi } from 'vitest';
import { buildSnapshot, SEARCH_TERMS } from '../../composables/freeride/liveheats';

const res = (data: any) => ({ ok: true, status: 200, json: async () => ({ data }) });
const gqlError = () => ({
  ok: true,
  status: 200,
  json: async () => ({ errors: [{ message: 'x' }] }),
});

const lausanne = {
  formattedAddress: 'Lausanne, Switzerland',
  countryCode: 'CH',
  location: { lat: 46.52, lng: 6.63 },
};
const nendaz = {
  formattedAddress: 'Nendaz, Switzerland',
  countryCode: 'CH',
  location: { lat: 46.18, lng: 7.29 },
};

function detail(id: string, over: Record<string, any> = {}) {
  return {
    id,
    name: `2027 Nendaz Freeride Qualifier 2* ${id}`,
    date: '2027-01-20T08:00:00Z',
    daysWindow: 3,
    status: 'upcoming',
    organisationId: '29100',
    hideEntries: false,
    location: nendaz,
    registrationOptions: { mode: 'open' },
    paymentOptions: { currency: 'CHF', defaultDivisionPrice: 12000 },
    eventDivisions: [
      {
        entryCount: 1,
        division: { name: 'Men Ski' },
        entries: [{ status: 'confirmed', athlete: { name: 'A B', nationality: 'CH' } }],
      },
    ],
    ...over,
  };
}

const stub = (
  discovery: (term: string) => any[],
  details: Record<string, any> = {},
  failDetail?: (ids: string[]) => boolean,
) => {
  const fn = vi.fn(async (_url: any, init: any) => {
    const query: string = JSON.parse(init.body).query;
    if (query.includes('eventsByName')) {
      const term = JSON.parse(/search: ("[^"]*")/.exec(query)![1]);
      return res({ eventsByName: discovery(term) });
    }
    const ids = [...query.matchAll(/e\d+: event\(id: "([^"]*)"\)/g)].map((m) => m[1]);
    if (failDetail?.(ids)) return { ok: false, status: 500, json: async () => ({}) };
    const data: Record<string, any> = {};
    ids.forEach((id, i) => (data[`e${i}`] = details[id] ?? null));
    return res(data);
  });
  return fn;
};

const run = (fn: any, now?: () => Date) =>
  buildSnapshot(fn as unknown as typeof fetch, undefined, now);
const detailCalls = (fn: any) =>
  fn.mock.calls
    .map((c: any) => JSON.parse(c[1].body).query)
    .filter((q: string) => !q.includes('eventsByName'));
const cand = (
  id: string,
  name = `2027 Nendaz Freeride Qualifier 2* ${id}`,
  date = '2027-01-20T08:00:00Z',
) => ({ id, name, date });

describe('buildSnapshot', () => {
  it('dedupes events found by several search terms', async () => {
    const fn = stub(() => [cand('1')], { '1': detail('1') });
    const { snapshot } = await run(fn);
    expect(snapshot.events).toHaveLength(1);
    expect(detailCalls(fn)).toHaveLength(1);
    expect(detailCalls(fn)[0].match(/event\(id/g)).toHaveLength(1);
    expect(fn.mock.calls.length).toBe(SEARCH_TERMS.length + 1);
  });

  it('pre-filters out-of-season and unclassifiable names', async () => {
    const fn = stub(
      (t) =>
        t === SEARCH_TERMS[0]
          ? [
              cand('1'),
              cand('2', 'Old Qualifier 1*', '2025-01-20T08:00:00Z'),
              cand('3', '2027 Random Gathering'),
            ]
          : [],
      { '1': detail('1') },
    );
    const { snapshot } = await run(fn);
    expect(snapshot.events.map((e) => e.id)).toEqual(['1']);
    const q = detailCalls(fn).join('\n');
    expect(q).toContain('"1"');
    expect(q).not.toContain('"2"');
    expect(q).not.toContain('"3"');
  });

  it('drops untrusted orgs and counts them', async () => {
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? [cand('1'), cand('2')] : []), {
      '1': detail('1'),
      '2': detail('2', { organisationId: '999' }),
    });
    const { snapshot, dropped } = await run(fn);
    expect(snapshot.events.map((e) => e.id)).toEqual(['1']);
    expect(dropped['untrusted-org']).toBe(1);
  });

  it('gives a Pro event in Lausanne the Baqueira coords', async () => {
    const name = '2027 Baqueira Beret Pro By Occident';
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? [cand('1', name)] : []), {
      '1': detail('1', { name, organisationId: '30783', location: lausanne }),
    });
    const { snapshot } = await run(fn);
    expect(snapshot.events[0]).toMatchObject({
      tier: 'pro',
      countryCode: 'ES',
      lat: 42.7,
      lng: 0.93,
    });
  });

  it('drops events outside Europe', async () => {
    const away = {
      formattedAddress: 'Whistler, Canada',
      countryCode: 'CA',
      location: { lat: 50.1, lng: -122.9 },
    };
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? [cand('1')] : []), {
      '1': detail('1', { location: away }),
    });
    const { snapshot, dropped } = await run(fn);
    expect(snapshot.events).toEqual([]);
    expect(dropped['outside-europe']).toBe(1);
  });

  it('maps price in cents, null price, and hidden entries', async () => {
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? [cand('1'), cand('2')] : []), {
      '1': detail('1'),
      '2': detail('2', { paymentOptions: null, hideEntries: true }),
    });
    const { snapshot } = await run(fn);
    const [a, b] = snapshot.events;
    expect(a.price).toEqual({ amountCents: 12000, currency: 'CHF' });
    expect(a.divisions[0].riders).toHaveLength(1);
    expect(a.url).toBe('https://liveheats.com/events/1');
    expect(a.registerUrl).toBe('https://liveheats.com/events/1/registration');
    expect(a.end).toBe('2027-01-22');
    expect(b.price).toBeNull();
    expect(b.divisions[0].riders).toEqual([]);
    expect(b.divisions[0].entryCount).toBe(1);
  });

  it('batches 45 ids into 3 detail requests with aliases', async () => {
    const list = Array.from({ length: 45 }, (_, i) => cand(String(1000 + i)));
    const details = Object.fromEntries(list.map((c) => [c.id, detail(c.id)]));
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? list : []), details);
    const { snapshot } = await run(fn);
    expect(snapshot.events).toHaveLength(45);
    const calls = detailCalls(fn);
    expect(calls).toHaveLength(3);
    for (const q of calls) expect(q).toContain('e0: event(id:');
    expect(calls[0]).toContain('e19: event(id:');
    expect(calls[0]).not.toContain('e20:');
    expect(calls[2]).toContain('e4: event(id:');
    expect(calls[2]).not.toContain('e5:');
  });

  it('rejects when discovery returns a GraphQL error', async () => {
    const fn = vi.fn(async () => gqlError());
    await expect(run(fn)).rejects.toThrow(/GraphQL/);
  });

  it('rejects when discovery returns an HTTP error', async () => {
    const fn = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(run(fn)).rejects.toThrow(/HTTP 503/);
  });

  it('skips a failed detail batch but keeps the others', async () => {
    const list = Array.from({ length: 25 }, (_, i) => cand(String(2000 + i)));
    const details = Object.fromEntries(list.map((c) => [c.id, detail(c.id)]));
    const warn = vi.fn();
    const fn = stub(
      (t) => (t === SEARCH_TERMS[0] ? list : []),
      details,
      (ids) => ids.includes('2000'),
    );
    const { snapshot, dropped } = await buildSnapshot(fn as unknown as typeof fetch, {
      info: () => {},
      warn,
    });
    expect(snapshot.events).toHaveLength(5);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(dropped['detail-failed']).toBe(20);
  });

  it('skips non-digit ids', async () => {
    const bad = cand('1") { id } x: event(id: "2');
    const fn = stub((t) => (t === SEARCH_TERMS[0] ? [bad, cand('1')] : []), { '1': detail('1') });
    const { snapshot } = await run(fn);
    expect(snapshot.events.map((e) => e.id)).toEqual(['1']);
    expect(detailCalls(fn).join('\n')).not.toContain('x: event');
  });

  it('uses the injected now for fetchedAt', async () => {
    const fn = stub(() => []);
    const { snapshot } = await run(fn, () => new Date('2026-11-03T10:00:00Z'));
    expect(snapshot.fetchedAt).toBe('2026-11-03T10:00:00.000Z');
    expect(snapshot.season).toBe('2026/27');
  });
});
