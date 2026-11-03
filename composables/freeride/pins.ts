import type { FreerideEvent, Tier } from './types';

export const TIER_COLORS: Record<Tier, string> = {
  pro: '#ff6b1a',
  challenger: '#c2410c',
  qualifier: '#1f6feb',
  junior: '#16a34a',
};

export const TIER_SHADES: Record<Tier, [string, string, string, string]> = {
  qualifier: ['#9cc3ff', '#5b9bf5', '#1f6feb', '#0b3d91'],
  junior: ['#9fe0b4', '#4cc277', '#16a34a', '#0b5d2a'],
  challenger: ['#f7b58f', '#e8793f', '#c2410c', '#7c2d12'],
  pro: ['#ffb38a', '#ff8c4d', '#ff6b1a', '#c2410c'],
};

export interface PinState {
  selected: boolean;
  planned: boolean;
  order: number | null;
}

type PinEvent = Pick<FreerideEvent, 'tier' | 'stars'>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function pinColor(e: PinEvent): string {
  return e.stars ? TIER_SHADES[e.tier][e.stars - 1] : TIER_COLORS[e.tier];
}

export function pinRows(e: PinEvent): string[] {
  if (e.tier === 'pro') return ['PRO'];
  if (e.tier === 'challenger' && !e.stars) return ['CH'];
  switch (e.stars) {
    case 1:
      return ['★'];
    case 2:
      return ['★★'];
    case 3:
      return ['★★', '★'];
    case 4:
      return ['★★', '★★'];
    default:
      return [];
  }
}

function leaderSvg(offset: { dx: number; dy: number }): string {
  const x1 = 15;
  const y1 = 40;
  const x2 = Number((x1 - offset.dx).toFixed(1));
  const y2 = Number((y1 - offset.dy).toFixed(1));
  return (
    `<svg class="fr-pin__leader" width="1" height="1" style="overflow: visible" aria-hidden="true">` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />` +
    `<circle cx="${x2}" cy="${y2}" r="3" /></svg>`
  );
}

export function pinHtml(e: PinEvent, state: PinState, offset?: { dx: number; dy: number }): string {
  const color = pinColor(e);
  const rows = pinRows(e)
    .map((r) => `<span class="fr-pin__row">${escapeHtml(r)}</span>`)
    .join('');
  const badge =
    state.planned && state.order !== null
      ? `<span class="fr-pin__order">${escapeHtml(String(state.order))}</span>`
      : '';
  const leader = offset && (offset.dx !== 0 || offset.dy !== 0) ? leaderSvg(offset) : '';
  return (
    `<div class="fr-pin__body" style="--pin-color: ${color}">` +
    `<span class="fr-pin__label">${rows}</span>${badge}</div>${leader}`
  );
}

export function pinClass(e: PinEvent, state: PinState): string {
  const classes = ['fr-pin', `fr-pin--${e.tier}`];
  if (e.stars === 1) classes.push('fr-pin--light');
  if (pinRows(e).length === 2) classes.push('fr-pin--rows2');
  if (state.selected) classes.push('fr-pin--selected');
  if (state.planned) classes.push('fr-pin--planned');
  return classes.join(' ');
}
