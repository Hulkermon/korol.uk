export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

export interface SpreadOptions {
  /** Minimum distance in px between two pins after spreading. */
  minDist?: number;
  /** Relaxation passes. */
  iterations?: number;
  /** Pull back towards the true location per pass (0..1). */
  spring?: number;
  /** Offsets smaller than this are dropped (pin stays on its point). */
  minOffset?: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Spreads pins that sit too close together on screen so each one can be clicked.
 * Collision relaxation: overlapping pins push each other apart, a weak spring pulls each pin back
 * towards its true location, so crowded areas become a compact honeycomb rather than one big
 * circle. Pins on identical coordinates are seeded on a small circle (in input order) so they
 * separate deterministically. Returns the offset of every displaced pin; others have no entry.
 */
export function spreadOffsets(
  points: ScreenPoint[],
  opts: SpreadOptions = {},
): Map<string, { dx: number; dy: number }> {
  const { minDist = 28, iterations = 80, spring = 0.04, minOffset = 2 } = opts;
  const n = points.length;
  const pos = points.map((p) => ({ x: p.x, y: p.y }));

  // Seed identical (or near-identical) points on a small circle so they have a direction to move.
  const seeded = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (seeded.has(i)) continue;
    const same = [i];
    for (let j = i + 1; j < n; j++) {
      if (!seeded.has(j) && Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < 1) {
        same.push(j);
      }
    }
    if (same.length < 2) continue;
    const r = minDist / 2;
    same.forEach((k, idx) => {
      seeded.add(k);
      const a = -Math.PI / 2 + (idx * 2 * Math.PI) / same.length;
      pos[k] = { x: points[k].x + r * Math.cos(a), y: points[k].y + r * Math.sin(a) };
    });
  }

  const relax = (): boolean => {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = pos[j].x - pos[i].x;
        let vy = pos[j].y - pos[i].y;
        let d = Math.hypot(vx, vy);
        if (d >= minDist - 0.01) continue;
        if (d < 1e-6) {
          // deterministic fallback direction
          vx = Math.cos(i + j);
          vy = Math.sin(i + j);
          d = 1e-6;
        }
        const push = (minDist - d) / 2;
        const ux = vx / Math.hypot(vx, vy);
        const uy = vy / Math.hypot(vx, vy);
        pos[i].x -= ux * push;
        pos[i].y -= uy * push;
        pos[j].x += ux * push;
        pos[j].y += uy * push;
        moved = true;
      }
    }
    return moved;
  };

  // Phase 1: relax with a weak spring back to the true location (keeps groups compact).
  for (let it = 0; it < iterations; it++) {
    relax();
    for (let i = 0; i < n; i++) {
      pos[i].x += (points[i].x - pos[i].x) * spring;
      pos[i].y += (points[i].y - pos[i].y) * spring;
    }
  }
  // Phase 2: relax without the spring until nothing overlaps any more.
  for (let it = 0; it < 200 && relax(); it++);

  const result = new Map<string, { dx: number; dy: number }>();
  for (let i = 0; i < n; i++) {
    const dx = pos[i].x - points[i].x;
    const dy = pos[i].y - points[i].y;
    if (Math.hypot(dx, dy) >= minOffset)
      result.set(points[i].id, { dx: round1(dx), dy: round1(dy) });
  }
  return result;
}
