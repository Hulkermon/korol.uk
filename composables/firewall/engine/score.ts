import type { ScoreSubmission } from './types';

export interface ScoreParts {
  wave: number;
  kills: number;
  integrity: number;
  credits: number;
  won: boolean;
}

function clampInt(v: number, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function computeScore(p: ScoreParts): number {
  const wave = clampInt(p.wave, 0, 20);
  const kills = clampInt(p.kills, 0, 5000);
  const integrity = clampInt(p.integrity, 0, 100);
  const credits = clampInt(p.credits, 0, 1000000);
  return (
    wave * 1000 + kills * 10 + integrity * 25 + Math.floor(credits / 2) + (p.won ? 10000 : 0)
  );
}

type ValidationResult = { ok: true; value: ScoreSubmission } | { ok: false; reason: string };

function intIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

export function validateSubmission(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string') return { ok: false, reason: 'Name must be a string' };
  const name = b.name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < 1 || name.length > 24) {
    return { ok: false, reason: 'Name must be 1-24 characters' };
  }
  if (!intIn(b.wave, 0, 20)) return { ok: false, reason: 'Invalid wave' };
  if (typeof b.won !== 'boolean') return { ok: false, reason: 'Invalid won flag' };
  if (!intIn(b.integrity, 0, 100)) return { ok: false, reason: 'Invalid integrity' };
  if (!intIn(b.kills, 0, 5000)) return { ok: false, reason: 'Invalid kills' };
  if (!intIn(b.credits, 0, 1000000)) return { ok: false, reason: 'Invalid credits' };
  if (b.won) {
    if (b.wave !== 20 || b.integrity <= 0) return { ok: false, reason: 'Invalid win' };
  } else if (b.integrity !== 0) {
    return { ok: false, reason: 'A loss requires zero integrity' };
  }
  return {
    ok: true,
    value: {
      name,
      wave: b.wave,
      won: b.won,
      kills: b.kills,
      integrity: b.integrity,
      credits: b.credits,
    },
  };
}
