import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  downloadText,
  eventDescription,
  eventsIcs,
  googleCalendarUrl,
  icsFilename,
  outlookCalendarUrl,
} from '@/composables/freeride/calendarExport';
import type { FreerideEvent } from '@/composables/freeride/types';

function ev(over: Partial<FreerideEvent> = {}): FreerideEvent {
  return {
    id: 'e1',
    name: 'Verbier Pro',
    tier: 'pro',
    stars: null,
    start: '2027-01-30',
    end: '2027-01-31',
    place: 'Verbier',
    countryCode: 'CH',
    lat: 0,
    lng: 0,
    status: 'upcoming',
    registrationMode: 'open',
    price: null,
    url: 'https://example.com/e1',
    registerUrl: null,
    divisions: [],
    ...over,
  } as unknown as FreerideEvent;
}

afterEach(() => vi.restoreAllMocks());

describe('eventDescription', () => {
  it('lists tier, window, url and site link', () => {
    expect(eventDescription(ev())).toBe(
      'PRO\nEvent window: 2027-01-30 – 2027-01-31\nhttps://example.com/e1\nhttps://korol.uk/freeride?event=e1',
    );
  });
  it('shows stars, FWQ label and single day', () => {
    const d = eventDescription(ev({ tier: 'qualifier', stars: 2, end: '2027-01-30' }));
    expect(d.split('\n').slice(0, 2)).toEqual(['FWQ ★★', 'Event window: 2027-01-30']);
    expect(eventDescription(ev({ tier: 'junior', stars: 1 })).startsWith('JUNIOR ★\n')).toBe(true);
  });
});

describe('calendar urls', () => {
  it('builds a google url with exclusive end across a month', () => {
    const url = googleCalendarUrl(ev({ name: 'A & B, "C"' }));
    expect(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE')).toBe(true);
    expect(url).toContain('&dates=20270130/20270201&');
    expect(url).toContain(`&text=${encodeURIComponent('A & B, "C"')}`);
    expect(url).toContain('&location=Verbier');
    expect(url).toContain(`&details=${encodeURIComponent(eventDescription(ev()))}`);
  });
  it('builds an outlook url with exclusive end', () => {
    const url = outlookCalendarUrl(ev());
    expect(url).toContain('compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent');
    expect(url).toContain('&subject=Verbier%20Pro');
    expect(url).toContain('&startdt=2027-01-30&enddt=2027-02-01&allday=true');
    expect(url).toContain('&location=Verbier');
  });
});

describe('eventsIcs', () => {
  const now = new Date('2027-01-02T03:04:05.678Z');

  it('builds a calendar with CRLF and two events', () => {
    const ics = eventsIcs([ev(), ev({ id: 'e2', start: '2027-02-05', end: '2027-02-05' })], now);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('PRODID:-//korol.uk//Freeride Planner//EN\r\n');
    expect(ics).toContain('UID:freeride-e1@korol.uk\r\n');
    expect(ics).toContain('DTSTAMP:20270102T030405Z\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270130\r\nDTEND;VALUE=DATE:20270201\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270205\r\nDTEND;VALUE=DATE:20270206\r\n');
    expect(ics).toContain('URL:https://example.com/e1\r\n');
  });

  it('escapes special characters', () => {
    const ics = eventsIcs([ev({ name: 'a,b;c\\d', place: 'x\ny' })], now);
    expect(ics).toContain('SUMMARY:a\\,b\\;c\\\\d\r\n');
    expect(ics).toContain('LOCATION:x\\ny\r\n');
    expect(ics).toContain('DESCRIPTION:PRO\\nEvent window: 2027-01-30 – 2027-01-31\\n');
  });

  it('folds long lines within 75 octets and unfolds losslessly', () => {
    const name = 'Évènement ★ '.repeat(20).trim();
    const ics = eventsIcs([ev({ name })], now);
    const enc = new TextEncoder();
    const physical = ics.split('\r\n');
    for (const line of physical) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    expect(physical.some((l) => l.startsWith(' '))).toBe(true);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`SUMMARY:${name}\r\n`);
  });
});

describe('icsFilename', () => {
  it('slugifies accents and symbols', () => {
    expect(icsFilename('Verbier Pro')).toBe('verbier-pro.ics');
    expect(icsFilename('Chamonix – Été ★ 2027!')).toBe('chamonix-ete-2027.ics');
  });
  it('falls back', () => {
    expect(icsFilename('')).toBe('freeride.ics');
    expect(icsFilename('★★')).toBe('freeride.ics');
  });
});

describe('downloadText', () => {
  it('clicks a temporary anchor and revokes the url', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    let clicked: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = this;
      expect(document.body.contains(this)).toBe(true);
    });
    downloadText('a.ics', 'hello');
    expect(create).toHaveBeenCalledTimes(1);
    expect(clicked!.download).toBe('a.ics');
    expect(clicked!.href).toContain('blob:x');
    expect(document.body.querySelector('a')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:x');
    vi.unstubAllGlobals();
  });
});
