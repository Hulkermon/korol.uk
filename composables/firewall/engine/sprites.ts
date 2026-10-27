import type { Shape } from './types';

const polygon = (
  ctx: CanvasRenderingContext2D,
  sides: number,
  x: number,
  y: number,
  r: number,
  rot: number,
) => {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/** Glowing neon outline with a dim fill. Caller sets ctx.shadowBlur/shadowColor for glow. */
export const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  x: number,
  y: number,
  r: number,
  color: string,
  angle = 0,
) => {
  switch (shape) {
    case 'diamond':
      polygon(ctx, 4, x, y, r * 1.15, angle);
      break;
    case 'hex':
      polygon(ctx, 6, x, y, r, angle);
      break;
    case 'triangle':
      polygon(ctx, 3, x, y, r * 1.1, angle - Math.PI / 2);
      break;
    case 'square':
      polygon(ctx, 4, x, y, r * 1.3, angle + Math.PI / 4);
      break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha /= 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};
