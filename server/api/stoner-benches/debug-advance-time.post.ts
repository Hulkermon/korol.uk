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

    let secondsToSubtract = 0;
    if (unit === 'HOUR') secondsToSubtract = amount * 3600;
    if (unit === 'MINUTE') secondsToSubtract = amount * 60;
    if (unit === 'SECOND') secondsToSubtract = amount;

    // We subtract the amount to "advance" time (make the deadline closer)
    // next_refresh is a BIGINT timestamp in seconds
    await db.execute(
      `UPDATE map_seeds SET next_refresh = next_refresh - ? ORDER BY created_at DESC LIMIT 1`,
      [secondsToSubtract]
    );

    // Fetch the updated seed to return the new nextRefresh
    const [seeds] = await db.query(
      'SELECT id, seed_value, next_refresh FROM map_seeds ORDER BY created_at DESC LIMIT 1'
    );

    if (Array.isArray(seeds) && seeds.length > 0) {
      const latest = seeds[0] as { next_refresh: number };
      return { success: true, nextRefresh: latest.next_refresh };
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
