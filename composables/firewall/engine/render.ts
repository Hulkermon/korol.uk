import { getAbilityDef } from '../data/abilities';
import { getBuildingDef } from '../data/buildings';
import { getEnemyDef } from '../data/enemies';
import { getTowerDef } from '../data/towers';
import { effectiveTowerStats, getAuraBonus } from './buildings';
import { canPlace } from './economy';
import { getPathLength, getPathPoints, cellCenter, posAtDist } from './path';
import { drawShape } from './sprites';
import {
  CELL,
  COLS,
  H,
  ROWS,
  W,
  type Cell,
  type Fx,
  type GameState,
  type Tower,
  type Vec,
} from './types';

export interface RenderView {
  hoverCell: Cell | null;
  placing: { kind: 'tower' | 'building'; defId: string } | null;
  selection: { kind: 'tower' | 'building'; id: number } | null;
  pendingAbility: string | null;
  mouse: Vec | null;
}

const ION_RADIUS = 90;
const MAX_GLOW_ENEMIES = 60;
const WAVE_COUNT = 20;

let overlay: HTMLCanvasElement | null = null;

const getOverlay = (): HTMLCanvasElement | null => {
  if (overlay) return overlay;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  overlay = c;
  return c;
};

const circle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stroke: string,
  fill?: string,
) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
};

const drawBackground = (ctx: CanvasRenderingContext2D, timeSec: number) => {
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) {
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, H);
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(W, r * CELL + 0.5);
  }
  ctx.stroke();
  // slow scrolling matrix sweep
  const sy = ((timeSec * 40) % (H + 80)) - 80;
  const g = ctx.createLinearGradient(0, sy, 0, sy + 80);
  g.addColorStop(0, 'rgba(0, 255, 120, 0)');
  g.addColorStop(1, 'rgba(0, 255, 120, 0.07)');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, W, 80);
};

const drawPath = (ctx: CanvasRenderingContext2D, timeSec: number) => {
  const pts = getPathPoints();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = 'rgba(120, 20, 90, 0.55)';
  ctx.lineWidth = CELL * 0.7;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 0, 170, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineCap = 'butt';
  // chevrons
  const len = getPathLength();
  const spacing = 36;
  const offset = (timeSec * 50) % spacing;
  ctx.strokeStyle = 'rgba(255, 90, 210, 0.5)';
  ctx.lineWidth = 2;
  for (let d = offset; d < len; d += spacing) {
    const a = posAtDist(d);
    const b = posAtDist(d + 4);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(3, 0);
    ctx.lineTo(-4, 6);
    ctx.stroke();
    ctx.restore();
  }
  // markers
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#00ffd0';
  ctx.textAlign = 'left';
  const start = pts[1] ?? pts[0];
  ctx.fillText('IN', Math.max(2, start.x - CELL / 2 + 4), start.y - 14);
  ctx.fillStyle = '#ff4d4d';
  ctx.textAlign = 'right';
  const end = pts[pts.length - 2] ?? pts[pts.length - 1];
  ctx.fillText('LAN', Math.min(W - 2, end.x + CELL / 2 - 4), end.y - 14);
  ctx.textAlign = 'left';
};

const pips = (ctx: CanvasRenderingContext2D, x: number, y: number, n: number, color: string) => {
  const count = Math.min(n, 6);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.fillRect(x - (count * 4) / 2 + i * 4 + 0.5, y, 3, 3);
  }
};

const drawFx = (ctx: CanvasRenderingContext2D, fx: Fx) => {
  const t = Math.min(1, fx.age / (fx.ttl || 1));
  const alpha = 1 - t;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = fx.color;
  ctx.fillStyle = fx.color;
  switch (fx.kind) {
    case 'beam':
    case 'zap': {
      if (!fx.to) break;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = fx.kind === 'beam' ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(fx.from.x, fx.from.y);
      if (fx.kind === 'zap') {
        const dx = fx.to.x - fx.from.x;
        const dy = fx.to.y - fx.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const segs = Math.max(2, Math.floor(len / 12));
        const seed = Math.floor(fx.age * 30);
        for (let i = 1; i < segs; i++) {
          const k = i / segs;
          const j = Math.sin(i * 12.9898 + seed * 78.233 + fx.from.x) * 6;
          ctx.lineTo(fx.from.x + dx * k - (dy / len) * j, fx.from.y + dy * k + (dx / len) * j);
        }
      }
      ctx.lineTo(fx.to.x, fx.to.y);
      ctx.stroke();
      break;
    }
    case 'ring': {
      const r = (fx.radius ?? 40) * (0.2 + 0.8 * t);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx.from.x, fx.from.y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'burst': {
      const r = (fx.radius ?? 20) * t;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        ctx.fillRect(fx.from.x + Math.cos(a) * r - 1, fx.from.y + Math.sin(a) * r - 1, 3, 3);
      }
      break;
    }
    case 'text': {
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fx.text ?? '', fx.from.x, fx.from.y - 24 * t);
      ctx.textAlign = 'left';
      break;
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

export const render = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  view: RenderView,
  timeSec: number,
): void => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  drawBackground(ctx, timeSec);
  drawPath(ctx, timeSec);

  if (state.phase !== 'title') {
    // (3) aura rings
    for (const b of state.buildings) {
      const hovered = view.hoverCell?.col === b.cell.col && view.hoverCell?.row === b.cell.row;
      const selected = view.selection?.kind === 'building' && view.selection.id === b.id;
      if (selected || hovered || view.placing?.kind === 'building') {
        const color = getBuildingDef(b.defId).color;
        ctx.globalAlpha = 0.5;
        circle(ctx, b.pos.x, b.pos.y, b.stats.auraRange, color, 'rgba(255,255,255,0.03)');
        ctx.globalAlpha = 1;
      }
    }

    // (4) buildings and towers
    ctx.shadowBlur = 8;
    for (const b of state.buildings) {
      const def = getBuildingDef(b.defId);
      ctx.shadowColor = def.color;
      drawShape(ctx, def.shape, b.pos.x, b.pos.y, 11, def.color, 0);
    }
    for (const t of state.towers) {
      const def = getTowerDef(t.defId);
      ctx.shadowColor = def.color;
      drawShape(ctx, def.shape, t.pos.x, t.pos.y, 11, def.color, 0);
    }
    ctx.shadowBlur = 0;
    for (const b of state.buildings) {
      const def = getBuildingDef(b.defId);
      pips(ctx, b.pos.x, b.pos.y + 15, 1 + b.purchased.length, def.color);
    }
    for (const t of state.towers) {
      const def = getTowerDef(t.defId);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.pos.x, t.pos.y);
      ctx.lineTo(t.pos.x + Math.cos(t.angle) * 14, t.pos.y + Math.sin(t.angle) * 14);
      ctx.stroke();
      pips(ctx, t.pos.x, t.pos.y + 15, 1 + t.purchased.length, def.color);
    }

    // (5) enemies
    const glow = state.enemies.length <= MAX_GLOW_ENEMIES;
    for (const e of state.enemies) {
      const def = getEnemyDef(e.defId);
      const stunned = state.time < e.stunUntil;
      const slowed = state.time < e.slowUntil;
      if (stunned && Math.floor(timeSec * 20) % 2 === 0) continue;
      const color = slowed ? '#6aa8ff' : def.color;
      if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }
      drawShape(ctx, def.shape, e.pos.x, e.pos.y, def.radius, color, timeSec * 0.5);
      ctx.shadowBlur = 0;
      const bw = def.boss ? 40 : 18;
      const bx = e.pos.x - bw / 2;
      const by = e.pos.y - def.radius - (def.boss ? 9 : 6);
      ctx.fillStyle = '#220008';
      ctx.fillRect(bx, by, bw, def.boss ? 4 : 3);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#3dff7a' : '#ff4d4d';
      ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, e.hp / e.maxHp)), def.boss ? 4 : 3);
    }

    // (6) projectiles and fx
    ctx.shadowBlur = 0;
    for (const p of state.projectiles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.pos.x - 2, p.pos.y - 2, 4, 4);
    }
    for (const fx of state.fx) drawFx(ctx, fx);

    // (7) placement ghost
    if (view.placing && view.hoverCell) {
      const ok = canPlace(state, view.hoverCell).ok;
      const c = cellCenter(view.hoverCell);
      const stroke = ok ? '#3dff7a' : '#ff4d4d';
      const fill = ok ? 'rgba(61,255,122,0.12)' : 'rgba(255,77,77,0.12)';
      ctx.fillStyle = fill;
      ctx.fillRect(view.hoverCell.col * CELL, view.hoverCell.row * CELL, CELL, CELL);
      const def =
        view.placing.kind === 'tower'
          ? getTowerDef(view.placing.defId)
          : getBuildingDef(view.placing.defId);
      const radius =
        view.placing.kind === 'tower'
          ? getTowerDef(view.placing.defId).base.range *
            (1 + getAuraBonus(state, { pos: c } as Tower).range)
          : getBuildingDef(view.placing.defId).base.auraRange;
      circle(ctx, c.x, c.y, radius, stroke, fill);
      ctx.globalAlpha = 0.7;
      drawShape(ctx, def.shape, c.x, c.y, 11, stroke, 0);
      ctx.globalAlpha = 1;
    }

    // (8) selected range
    if (view.selection) {
      const sel =
        view.selection.kind === 'tower'
          ? state.towers.find((t) => t.id === view.selection!.id)
          : state.buildings.find((b) => b.id === view.selection!.id);
      if (sel) {
        const radius =
          'range' in sel.stats
            ? effectiveTowerStats(state, sel as Tower).range
            : sel.stats.auraRange;
        circle(ctx, sel.pos.x, sel.pos.y, radius, '#ffffff', 'rgba(255,255,255,0.05)');
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(sel.cell.col * CELL + 1.5, sel.cell.row * CELL + 1.5, CELL - 3, CELL - 3);
      }
    }

    // (9) pending ion strike
    if (view.pendingAbility === 'ion' && view.mouse) {
      const color = getAbilityDef('ion').color;
      const { x, y } = view.mouse;
      circle(ctx, x, y, ION_RADIUS, color, 'rgba(179,107,255,0.1)');
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - ION_RADIUS - 8, y);
      ctx.lineTo(x + ION_RADIUS + 8, y);
      ctx.moveTo(x, y - ION_RADIUS - 8);
      ctx.lineTo(x, y + ION_RADIUS + 8);
      ctx.stroke();
    }
  }

  // (10) CRT overlay and HUD
  const crt = getOverlay();
  if (crt) ctx.drawImage(crt, 0, 0);
  if (state.phase === 'wave') {
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff9c';
    ctx.fillText(`WAVE ${state.wave + 1}/${WAVE_COUNT}`, 6, 6);
  }
  ctx.restore();
};
