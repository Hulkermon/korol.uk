export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function spreadOffsets(
  points: ScreenPoint[],
  threshold = 30,
): Map<string, { dx: number; dy: number }> {
  const result = new Map<string, { dx: number; dy: number }>();
  const n = points.length;
  const parent = points.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < threshold) {
        const a = find(i);
        const b = find(j);
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const g = groups.get(root);
    if (g) g.push(i);
    else groups.set(root, [i]);
  }

  for (const members of groups.values()) {
    const size = members.length;
    if (size < 2) continue;
    let cx = 0;
    let cy = 0;
    for (const i of members) {
      cx += points[i].x;
      cy += points[i].y;
    }
    cx /= size;
    cy /= size;
    const r = Math.max(22, size * 7);
    members.forEach((i, k) => {
      const angle = -Math.PI / 2 + (k * 2 * Math.PI) / size;
      const tx = cx + r * Math.cos(angle);
      const ty = cy + r * Math.sin(angle);
      result.set(points[i].id, {
        dx: round1(tx - points[i].x),
        dy: round1(ty - points[i].y),
      });
    });
  }

  return result;
}
