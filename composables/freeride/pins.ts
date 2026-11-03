import type { FreerideEvent, Tier } from './types';

export const TIER_COLORS: Record<Tier, string> = {
  pro: '#ff6b1a',
  challenger: '#c2410c',
  qualifier: '#1f6feb',
  junior: '#16a34a',
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

export function pinLabel(e: PinEvent): string {
  if (e.tier === 'pro') return 'PRO';
  if (e.tier === 'challenger' && !e.stars) return 'CH';
  const stars = '★'.repeat(e.stars ?? 0);
  return e.tier === 'junior' ? `J${stars}` : stars;
}

export function pinHtml(e: PinEvent, state: PinState): string {
  const color = TIER_COLORS[e.tier];
  const badge =
    state.planned && state.order !== null
      ? `<span class="fr-pin__order">${escapeHtml(String(state.order))}</span>`
      : '';
  return (
    `<div class="fr-pin__body" style="--pin-color: ${color}">` +
    `<span class="fr-pin__label">${escapeHtml(pinLabel(e))}</span>${badge}</div>`
  );
}

export function pinClass(e: PinEvent, state: PinState): string {
  const classes = ['fr-pin', `fr-pin--${e.tier}`];
  if (state.selected) classes.push('fr-pin--selected');
  if (state.planned) classes.push('fr-pin--planned');
  return classes.join(' ');
}
