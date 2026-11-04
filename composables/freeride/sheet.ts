export type Snap = 'peek' | 'half' | 'full';

export const SNAPS: Snap[] = ['peek', 'half', 'full'];

const PEEK_PX = 112;
const FULL_MARGIN_PX = 56;
const FLICK_VELOCITY = 0.5;

export function snapHeight(snap: Snap, viewportPx: number): number {
  if (snap === 'peek') return PEEK_PX;
  if (snap === 'half') return viewportPx * 0.5;
  return viewportPx - FULL_MARGIN_PX;
}

export function clampHeight(h: number, viewport: number): number {
  return Math.min(snapHeight('full', viewport), Math.max(PEEK_PX, h));
}

export function nearestSnap(heightPx: number, viewportPx: number, velocityPxPerMs = 0): Snap {
  let best = 0;
  let bestDist = Infinity;
  SNAPS.forEach((s, i) => {
    const d = Math.abs(snapHeight(s, viewportPx) - heightPx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  if (Math.abs(velocityPxPerMs) > FLICK_VELOCITY) {
    best += velocityPxPerMs > 0 ? 1 : -1;
    best = Math.min(SNAPS.length - 1, Math.max(0, best));
  }
  return SNAPS[best];
}
