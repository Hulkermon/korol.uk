import type { Cell } from '../engine/types';

/** Axis-aligned path. The first and last cells sit just outside the grid. */
export const WAYPOINTS: Cell[] = [
  { col: -1, row: 1 },
  { col: 15, row: 1 },
  { col: 15, row: 4 },
  { col: 2, row: 4 },
  { col: 2, row: 7 },
  { col: 15, row: 7 },
  { col: 15, row: 9 },
  { col: 18, row: 9 },
];
