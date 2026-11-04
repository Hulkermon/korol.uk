import { describe, expect, it } from 'vitest';
import { clampHeight, nearestSnap, snapHeight } from '@/composables/freeride/sheet';

const VP = 800;

describe('sheet', () => {
  it('computes snap heights', () => {
    expect(snapHeight('peek', VP)).toBe(112);
    expect(snapHeight('half', VP)).toBe(400);
    expect(snapHeight('full', VP)).toBe(744);
  });

  it('picks the nearest snap by distance', () => {
    expect(nearestSnap(150, VP)).toBe('peek');
    expect(nearestSnap(380, VP)).toBe('half');
    expect(nearestSnap(700, VP)).toBe('full');
  });

  it('flicks one step in the velocity direction', () => {
    expect(nearestSnap(380, VP, 0.8)).toBe('full');
    expect(nearestSnap(380, VP, -0.8)).toBe('peek');
    expect(nearestSnap(150, VP, 0.8)).toBe('half');
  });

  it('stays at the ends when flicking further', () => {
    expect(nearestSnap(744, VP, 1)).toBe('full');
    expect(nearestSnap(112, VP, -1)).toBe('peek');
  });

  it('ignores slow velocity', () => {
    expect(nearestSnap(380, VP, 0.4)).toBe('half');
  });

  it('clamps height', () => {
    expect(clampHeight(10, VP)).toBe(112);
    expect(clampHeight(300, VP)).toBe(300);
    expect(clampHeight(5000, VP)).toBe(744);
  });
});
