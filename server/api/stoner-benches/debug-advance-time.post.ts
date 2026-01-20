export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();
    const body = await readBody(event);
    const { unit, amount } = body;

    const validUnits = ['HOUR', 'MINUTE', 'SECOND'];
    if (!validUnits.includes(unit) || typeof amount !== 'number') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid parameters',
      });
    }

    // DATE_SUB with positive amount moves time back (older created_at -> sooner refresh)
    // DATE_SUB with negative amount moves time forward (newer created_at -> later refresh)
    await db.execute(
      `UPDATE map_seeds SET created_at = DATE_SUB(created_at, INTERVAL ? ${unit}) ORDER BY created_at DESC LIMIT 1`,
      [amount]
    );

    // Fetch the updated seed to return the new nextRefresh
    const [seeds] = await db.query(
      'SELECT id, seed_value, created_at FROM map_seeds ORDER BY created_at DESC LIMIT 1'
    );

    if (Array.isArray(seeds) && seeds.length > 0) {
      const latest = seeds[0] as { created_at: Date };
      const nextRefresh = new Date(new Date(latest.created_at).getTime() + 24 * 60 * 60 * 1000);
      return { success: true, nextRefresh: nextRefresh.toISOString() };
    }

    return { success: false, message: 'No active seed found' };
  } catch (error) {
    console.error('Error shifting time:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to shift time',
    });
  }
});
