import { describe, expect, it } from 'vitest';
import { WAYPOINTS } from '../../composables/firewall/data/map';
import {
  cellCenter,
  getPathLength,
  getPathPoints,
  isPathCell,
  pointToCell,
  posAtDist,
} from '../../composables/firewall/engine/path';
import { COLS, ROWS, nextId, pushNews } from '../../composables/firewall/engine/types';
import { makeTestState } from './helpers';

describe('path', () => {
  it('starts at the first waypoint and clamps below zero', () => {
    const start = getPathPoints()[0];
    expect(posAtDist(0)).toEqual(start);
    expect(posAtDist(-50)).toEqual(start);
  });

  it('ends at the last waypoint and clamps past the end', () => {
    const pts = getPathPoints();
    const end = pts[pts.length - 1];
    expect(posAtDist(getPathLength())).toEqual(end);
    expect(posAtDist(getPathLength() + 999)).toEqual(end);
  });

  it('length equals the polyline length', () => {
    const pts = getPathPoints();
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      sum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    expect(getPathLength()).toBeCloseTo(sum);
  });

  it('keeps the path length in the balanced band with enough turns', () => {
    expect(getPathLength()).toBeGreaterThanOrEqual(1950);
    expect(getPathLength()).toBeLessThanOrEqual(2290);
    expect(WAYPOINTS.length).toBeGreaterThanOrEqual(10);
  });

  it('has long vertical runs and tight hairpins, not just horizontal sweeps', () => {
    const segs = WAYPOINTS.slice(1).map((b, i) => ({ a: WAYPOINTS[i], b }));
    const vertical = segs.filter(({ a, b }) => a.col === b.col && Math.abs(b.row - a.row) >= 4);
    expect(vertical.length).toBeGreaterThanOrEqual(3);
    // a hairpin: two runs in opposite directions joined by a short crossing
    let hairpins = 0;
    for (let i = 2; i < segs.length; i++) {
      const [s1, s2, s3] = [segs[i - 2], segs[i - 1], segs[i]];
      const d1 = Math.sign(s1.b.col - s1.a.col + (s1.b.row - s1.a.row));
      const d3 = Math.sign(s3.b.col - s3.a.col + (s3.b.row - s3.a.row));
      const gap = Math.abs(s2.b.col - s2.a.col) + Math.abs(s2.b.row - s2.a.row);
      if (d1 === -d3 && gap <= 3) hairpins++;
    }
    expect(hairpins).toBeGreaterThanOrEqual(2);
  });

  it('interpolates along the first segment', () => {
    const start = getPathPoints()[0];
    const p = posAtDist(100);
    expect(p.x).toBeCloseTo(start.x + 100);
    expect(p.y).toBeCloseTo(start.y);
  });

  it('marks every cell on every segment as path', () => {
    for (let i = 1; i < WAYPOINTS.length; i++) {
      const a = WAYPOINTS[i - 1];
      const b = WAYPOINTS[i];
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
        for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
          expect(isPathCell({ col: c, row: r })).toBe(true);
        }
      }
    }
  });

  it('leaves free cells buildable', () => {
    expect(isPathCell({ col: 0, row: 0 })).toBe(false);
    expect(isPathCell({ col: 8, row: 2 })).toBe(false);
    expect(isPathCell({ col: 8, row: 10 })).toBe(false);
  });

  it('keeps some buildable space in every row', () => {
    for (let r = 0; r < ROWS; r++) {
      let free = 0;
      for (let c = 0; c < COLS; c++) if (!isPathCell({ col: c, row: r })) free++;
      expect(free).toBeGreaterThan(0);
    }
  });

  it('has no overlapping segments (no cell is visited twice)', () => {
    const seen = new Set<string>();
    for (let i = 1; i < WAYPOINTS.length; i++) {
      const a = WAYPOINTS[i - 1];
      const b = WAYPOINTS[i];
      const dc = Math.sign(b.col - a.col);
      const dr = Math.sign(b.row - a.row);
      // skip the shared corner cell, which belongs to the previous segment
      let col = a.col + (i > 1 ? dc : 0);
      let row = a.row + (i > 1 ? dr : 0);
      while (true) {
        const key = `${col},${row}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        if (col === b.col && row === b.row) break;
        col += dc;
        row += dr;
      }
    }
  });

  it('maps points to cells and back', () => {
    expect(pointToCell({ x: 1, y: 1 })).toEqual({ col: 0, row: 0 });
    expect(pointToCell({ x: 719, y: 439 })).toEqual({ col: COLS - 1, row: ROWS - 1 });
    const cell = { col: 5, row: 3 };
    expect(pointToCell(cellCenter(cell))).toEqual(cell);
  });

  it('returns null outside the grid', () => {
    expect(pointToCell({ x: -1, y: 10 })).toBeNull();
    expect(pointToCell({ x: 10, y: -1 })).toBeNull();
    expect(pointToCell({ x: 720, y: 10 })).toBeNull();
    expect(pointToCell({ x: 10, y: 440 })).toBeNull();
  });
});

describe('state helpers', () => {
  it('nextId increments the counter', () => {
    const s = makeTestState();
    expect(nextId(s)).toBe(1);
    expect(nextId(s)).toBe(2);
    expect(s.nextId).toBe(3);
  });

  it('pushNews keeps the newest 30 items', () => {
    const s = makeTestState();
    for (let i = 0; i < 40; i++) pushNews(s, `n${i}`);
    expect(s.news).toHaveLength(30);
    expect(s.news[29]).toBe('n39');
    expect(s.news[0]).toBe('n10');
  });
});
