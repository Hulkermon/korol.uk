import type { FreerideEvent } from './types';
import { dayToNum, numToDay, passesLegend } from './filters';
import type { DateRange, LegendFilter } from './filters';
import { riderId } from './homies';

export interface CalendarFilter {
  legend: LegendFilter;
  onlyPlan: boolean;
  onlyHomies: boolean;
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
}

export interface CalendarBar {
  event: FreerideEvent;
  col: number; // 0-6, Monday = 0
  span: number;
  lane: number;
  contLeft: boolean;
  contRight: boolean;
}

export interface CalendarWeek {
  days: CalendarDay[];
  bars: CalendarBar[];
  lanes: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function byStartThenName(a: FreerideEvent, b: FreerideEvent): number {
  return a.start.localeCompare(b.start) || a.name.localeCompare(b.name);
}

export function calendarEvents(
  events: FreerideEvent[],
  filter: CalendarFilter,
  plannedIds: string[],
  homieKeys: string[],
): FreerideEvent[] {
  const planned = new Set(plannedIds);
  const homies = new Set(homieKeys);
  return events
    .filter((e) => {
      if (!passesLegend(e, filter.legend)) return false;
      if (filter.onlyPlan && !planned.has(e.id)) return false;
      if (
        filter.onlyHomies &&
        !e.divisions.some((d) => d.riders.some((r) => homies.has(riderId(r))))
      ) {
        return false;
      }
      return true;
    })
    .sort(byStartThenName);
}

export function seasonMonths(bounds: DateRange): string[] {
  let [y, m] = bounds.from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = bounds.to.slice(0, 7).split('-').map(Number);
  const out: string[] = [];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function initialMonth(months: string[], today: string): string {
  const current = today.slice(0, 7);
  if (months.includes(current)) return current;
  if (months.length > 0 && current < months[0]) return months[0];
  return months[months.length - 1];
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function monthGrid(month: string, events: FreerideEvent[]): CalendarWeek[] {
  const [y, m] = month.split('-').map(Number);
  const first = dayToNum(`${month}-01`);
  const nextFirst = dayToNum(
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`,
  );
  const last = nextFirst - 1;
  const gridStart = first - ((first + 3) % 7); // epoch day 0 was a Thursday
  const weekCount = Math.ceil((last - gridStart + 1) / 7);

  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < weekCount; w++) {
    const ws = gridStart + w * 7;
    const we = ws + 6;
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = numToDay(ws + i);
      days.push({ date, day: Number(date.slice(8, 10)), inMonth: date.startsWith(month) });
    }

    const bars: CalendarBar[] = [];
    for (const event of events) {
      const s = dayToNum(event.start);
      const e = dayToNum(event.end);
      if (s > we || e < ws) continue;
      const cs = Math.max(s, ws);
      const ce = Math.min(e, we);
      bars.push({
        event,
        col: cs - ws,
        span: ce - cs + 1,
        lane: 0,
        contLeft: s < ws,
        contRight: e > we,
      });
    }
    bars.sort(
      (a, b) => a.col - b.col || b.span - a.span || a.event.name.localeCompare(b.event.name),
    );

    const laneEnds: number[] = []; // first free column per lane
    let lanes = 0;
    for (const bar of bars) {
      let lane = laneEnds.findIndex((end) => end <= bar.col);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = bar.col + bar.span;
      bar.lane = lane;
      lanes = Math.max(lanes, lane + 1);
    }
    weeks.push({ days, bars, lanes });
  }
  return weeks;
}

export function agendaGroups(
  events: FreerideEvent[],
): { month: string; label: string; events: FreerideEvent[] }[] {
  const groups = new Map<string, FreerideEvent[]>();
  for (const e of [...events].sort(byStartThenName)) {
    const month = e.start.slice(0, 7);
    const list = groups.get(month);
    if (list) list.push(e);
    else groups.set(month, [e]);
  }
  return [...groups.keys()]
    .sort()
    .map((month) => ({ month, label: monthLabel(month), events: groups.get(month)! }));
}
