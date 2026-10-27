import { computeScore, validateSubmission } from '../../../composables/firewall/engine/score';

const RATE_LIMIT_MS = 20_000;
const lastSubmission = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const result = validateSubmission(body);
  if (!result.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: result.reason,
    });
  }
  const s = result.value;

  const now = Date.now();
  for (const [key, time] of lastSubmission) {
    if (now - time >= RATE_LIMIT_MS) lastSubmission.delete(key);
  }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  if (lastSubmission.has(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many submissions, slow down',
    });
  }

  const score = computeScore(s);

  try {
    const db = await useDb();
    const [insert] = await db.execute(
      'INSERT INTO firewall_scores (player_name, score, wave_reached, won, kills, integrity) VALUES (?, ?, ?, ?, ?, ?)',
      [s.name, score, s.wave, s.won ? 1 : 0, s.kills, s.integrity]
    );
    const [rows] = await db.query(
      'SELECT COUNT(*) AS higher FROM firewall_scores WHERE score > ?',
      [score]
    );
    lastSubmission.set(ip, now);
    return { id: (insert as any).insertId, score, rank: 1 + Number((rows as any[])[0].higher) };
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error saving firewall score',
    });
  }
});
