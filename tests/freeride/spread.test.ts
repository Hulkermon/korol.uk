import { describe, it, expect } from 'vitest';
import { spreadOffsets, type ScreenPoint } from '../../composables/freeride/spread';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function displaced(points: ScreenPoint[]) {
  const offsets = spreadOffsets(points);
  return points.map((p) => {
    const o = offsets.get(p.id)!;
    return { x: p.x + o.dx, y: p.y + o.dy };
  });
}

describe('spreadOffsets', () => {
  it('returns nothing for isolated points', () => {
    const pts = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 0, y: 200 },
    ];
    expect(spreadOffsets(pts).size).toBe(0);
  });

  it('spreads identical points apart', () => {
    const pts = ['a', 'b', 'c'].map((id) => ({ id, x: 50, y: 60 }));
    const offsets = spreadOffsets(pts);
    expect(offsets.size).toBe(3);
    const out = displaced(pts);
    for (const d of out) expect(dist(d, pts[0])).toBeGreaterThanOrEqual(22 - 0.2);
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++)
        expect(dist(out[i], out[j])).toBeGreaterThanOrEqual(24);
  });

  it('groups transitively', () => {
    const pts = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 25, y: 0 },
      { id: 'c', x: 50, y: 0 },
    ];
    expect(dist(pts[0], pts[2])).toBeGreaterThan(30);
    expect([...spreadOffsets(pts).keys()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic', () => {
    const pts = [
      { id: 'a', x: 10, y: 10 },
      { id: 'b', x: 12, y: 14 },
      { id: 'c', x: 11, y: 9 },
      { id: 'd', x: 300, y: 300 },
    ];
    expect(spreadOffsets(pts)).toEqual(spreadOffsets(pts));
  });

  it('separates a near pair', () => {
    const pts = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 105, y: 103 },
    ];
    const out = displaced(pts);
    expect(dist(out[0], out[1])).toBeGreaterThanOrEqual(24);
  });

  it('leaves singletons next to a group untouched', () => {
    const pts = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 0, y: 0 },
      { id: 'far', x: 200, y: 0 },
    ];
    const offsets = spreadOffsets(pts);
    expect(offsets.has('far')).toBe(false);
    expect(offsets.has('a')).toBe(true);
    expect(offsets.has('b')).toBe(true);
  });
});
