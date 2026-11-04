import type { FreerideEvent } from '@/composables/freeride/types';
import { dayToNum, numToDay } from '@/composables/freeride/filters';

const SITE = 'https://korol.uk/freeride';

function tierLabel(e: FreerideEvent): string {
  const stars = e.stars ? ` ${'★'.repeat(e.stars)}` : '';
  if (e.tier === 'pro') return `PRO${stars}`;
  if (e.tier === 'challenger') return `CHALLENGER${stars}`;
  if (e.tier === 'qualifier') return `FWQ${stars}`;
  return `JUNIOR${stars}`;
}

function nextDay(day: string): string {
  return numToDay(dayToNum(day) + 1);
}

function compact(day: string): string {
  return day.replace(/-/g, '');
}

export function eventDescription(e: FreerideEvent): string {
  const window = e.start === e.end ? e.start : `${e.start} – ${e.end}`;
  return [tierLabel(e), `Event window: ${window}`, e.url, `${SITE}?event=${e.id}`].join('\n');
}

export function googleCalendarUrl(e: FreerideEvent): string {
  const dates = `${compact(e.start)}/${compact(nextDay(e.end))}`;
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(e.name)}` +
    `&dates=${dates}` +
    `&details=${encodeURIComponent(eventDescription(e))}` +
    `&location=${encodeURIComponent(e.place)}`
  );
}

export function outlookCalendarUrl(e: FreerideEvent): string {
  return (
    'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose' +
    '&rru=addevent' +
    `&subject=${encodeURIComponent(e.name)}` +
    `&startdt=${e.start}` +
    `&enddt=${nextDay(e.end)}` +
    '&allday=true' +
    `&body=${encodeURIComponent(eventDescription(e))}` +
    `&location=${encodeURIComponent(e.place)}`
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const encoder = new TextEncoder();

function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  // First line holds 75 octets; continuation lines hold 74 plus the leading space.
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (size + n > limit) {
      parts.push(current);
      current = '';
      size = 0;
      limit = 74;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

export function eventsIcs(events: FreerideEvent[], now: Date): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//korol.uk//Freeride Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const stamp = icsStamp(now);
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:freeride-${e.id}@korol.uk`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(e.end))}`,
      `SUMMARY:${escapeText(e.name)}`,
      `LOCATION:${escapeText(e.place)}`,
      `DESCRIPTION:${escapeText(eventDescription(e))}`,
      `URL:${e.url}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function icsFilename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}.ics` : 'freeride.ics';
}

export function downloadText(
  filename: string,
  text: string,
  mime = 'text/calendar;charset=utf-8',
  doc: Document = document,
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
