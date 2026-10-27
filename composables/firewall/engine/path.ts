import { WAYPOINTS } from '../data/map';
import { CELL, COLS, ROWS, type Cell, type Vec } from './types';

export const cellCenter = (cell: Cell): Vec => ({
  x: cell.col * CELL + CELL / 2,
  y: cell.row * CELL + CELL / 2,
});

const points: Vec[] = WAYPOINTS.map(cellCenter);

const cumulative: number[] = [0];
for (let i = 1; i < points.length; i++) {
  const a = points[i - 1];
  const b = points[i];
  cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
}

const pathCells = new Set<string>();
for (let i = 1; i < WAYPOINTS.length; i++) {
  const a = WAYPOINTS[i - 1];
  const b = WAYPOINTS[i];
  const dc = Math.sign(b.col - a.col);
  const dr = Math.sign(b.row - a.row);
  let { col, row } = a;
  while (true) {
    pathCells.add(`${col},${row}`);
    if (col === b.col && row === b.row) break;
    col += dc;
    row += dr;
  }
}

export const getPathPoints = (): Vec[] => points.map((p) => ({ ...p }));

export const getPathLength = (): number => cumulative[cumulative.length - 1];

export const posAtDist = (d: number): Vec => {
  const dist = Math.min(Math.max(d, 0), getPathLength());
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < dist) i++;
  const a = points[i - 1];
  const b = points[i];
  const segLen = cumulative[i] - cumulative[i - 1];
  const t = segLen === 0 ? 0 : (dist - cumulative[i - 1]) / segLen;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
};

export const isPathCell = (cell: Cell): boolean => pathCells.has(`${cell.col},${cell.row}`);

export const pointToCell = (p: Vec): Cell | null => {
  const col = Math.floor(p.x / CELL);
  const row = Math.floor(p.y / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
};
