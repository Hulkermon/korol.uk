export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();
    const [rows] = await db.query(
      'SELECT id, player_name, score, wave_reached, won, kills, created_at FROM firewall_scores ORDER BY score DESC, created_at ASC LIMIT 10'
    );
    return (rows as any[]).map((r) => ({
      id: r.id,
      name: r.player_name,
      score: r.score,
      wave: r.wave_reached,
      won: !!r.won,
      kills: r.kills,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error fetching firewall scores',
    });
  }
});
