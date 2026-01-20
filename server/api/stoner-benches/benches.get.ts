export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  if (!query.seedValue) {
    throw createError({
      statusCode: 400,
      statusMessage: 'seedValue query parameter is required',
    });
  }

  try {
    const db = await useDb();

    const [benches] = await db.query(
      `SELECT sb.id, sb.x, sb.y, sb.title, sb.description, sb.author_name, sb.created_at
       FROM stoner_benches sb
       JOIN map_seeds ms ON sb.map_seed_id = ms.id
       WHERE ms.seed_value = ?
       ORDER BY sb.created_at DESC`,
      [query.seedValue]
    );

    return { benches: benches || [] };
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error fetching benches',
    });
  }
});
