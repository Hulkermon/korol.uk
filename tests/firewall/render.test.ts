import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, type RenderView } from '../../composables/firewall/engine/render';
import { placeBuilding, placeTower } from '../../composables/firewall/engine/economy';
import { createEnemy } from '../../composables/firewall/engine/waves';
import type { Fx } from '../../composables/firewall/engine/types';
import { makeTestState } from './helpers';

// A canvas context stand-in: every method is a no-op, gradients accept color stops,
// and every property can be assigned. Records the calls so tests can assert on drawing.
const makeCtx = () => {
  const calls: string[] = [];
  const target: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return (...args: unknown[]) => {
        calls.push(String(prop));
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return { addColorStop: () => undefined };
        }
        if (prop === 'measureText') return { width: 10 };
        return args.length ? undefined : undefined;
      };
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
};

const idleView: RenderView = {
  hoverCell: null,
  placing: null,
  selection: null,
  pendingAbility: null,
  mouse: null,
};

const populatedState = () => {
  const s = makeTestState({ phase: 'wave', wave: 3 });
  placeTower(s, 'ping', { col: 3, row: 2 });
  placeTower(s, 'bomb', { col: 5, row: 2 });
  placeBuilding(s, 'rack', { col: 4, row: 3 });
  const e = createEnemy(s, 'trojan', 120);
  e.slowUntil = 10;
  e.slowFactor = 0.5;
  createEnemy(s, 'y2k', 300).stunUntil = 10;
  const fx: Fx[] = [
    { kind: 'beam', from: { x: 10, y: 10 }, to: { x: 100, y: 60 }, color: '#0ff', age: 0.1, ttl: 0.3 },
    { kind: 'zap', from: { x: 10, y: 10 }, to: { x: 100, y: 60 }, color: '#ff0', age: 0.1, ttl: 0.3 },
    { kind: 'ring', from: { x: 200, y: 200 }, color: '#f0f', age: 0.1, ttl: 0.5, radius: 60 },
    { kind: 'burst', from: { x: 200, y: 200 }, color: '#f00', age: 0.1, ttl: 0.5, radius: 30 },
    { kind: 'text', from: { x: 50, y: 50 }, color: '#fff', age: 0.1, ttl: 1, text: '+5' },
  ];
  s.fx.push(...fx);
  s.projectiles.push({
    id: 99, from: { x: 0, y: 0 }, pos: { x: 100, y: 100 }, targetId: e.id, speed: 100, damage: 1,
    splashRadius: 0, slowFactor: 1, slowDuration: 0, stunDuration: 0, dotDps: 0, dotDuration: 0,
    armorPierce: 0, color: '#0ff', sourceTowerId: 1,
  });
  return s;
};

describe('render', () => {
  beforeEach(() => {
    // jsdom has no canvas; the CRT overlay creates an offscreen one lazily
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => makeCtx().ctx as never
    );
  });

  it('draws the title phase without throwing', () => {
    const { ctx, calls } = makeCtx();
    render(ctx, makeTestState({ phase: 'title' }), idleView, 1.5);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('draws a populated wave with every fx kind', () => {
    const { ctx, calls } = makeCtx();
    expect(() => render(ctx, populatedState(), idleView, 2)).not.toThrow();
    expect(calls.length).toBeGreaterThan(50);
  });

  it('draws the placement ghost, selection, and ion crosshair', () => {
    const s = populatedState();
    const views: RenderView[] = [
      { ...idleView, hoverCell: { col: 8, row: 2 }, placing: { kind: 'tower', defId: 'arc' } },
      { ...idleView, hoverCell: { col: 1, row: 1 }, placing: { kind: 'building', defId: 'antenna' } },
      { ...idleView, selection: { kind: 'tower', id: s.towers[0].id } },
      { ...idleView, selection: { kind: 'building', id: s.buildings[0].id } },
      { ...idleView, pendingAbility: 'ion', mouse: { x: 300, y: 200 } },
    ];
    for (const v of views) {
      const { ctx } = makeCtx();
      expect(() => render(ctx, s, v, 3)).not.toThrow();
    }
  });

  it('does not mutate the state', () => {
    const s = populatedState();
    const before = JSON.stringify(s);
    render(makeCtx().ctx, s, { ...idleView, hoverCell: { col: 8, row: 2 } }, 4);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('survives a crowd of enemies (glow cap path)', () => {
    const s = makeTestState({ phase: 'wave' });
    for (let i = 0; i < 90; i++) createEnemy(s, 'popup', i * 10);
    expect(() => render(makeCtx().ctx, s, idleView, 0)).not.toThrow();
  });
});
