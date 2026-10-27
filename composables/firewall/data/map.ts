import type { Cell } from '../engine/types';

/** Axis-aligned path. The first and last cells sit just outside the grid. */
export const WAYPOINTS: Cell[] = [
  { col: -1, row: 1 },
  { col: 7, row: 1 },
  { col: 7, row: 6 },
  { col: 2, row: 6 },
  { col: 2, row: 9 },
  { col: 10, row: 9 },
  { col: 10, row: 4 },
  { col: 12, row: 4 },
  { col: 12, row: 9 },
  { col: 14, row: 9 },
  { col: 14, row: 1 },
  { col: 18, row: 1 },
];
