export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.seedValue || !body.x || body.y === undefined || !body.title || !body.description || !body.authorName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'seedValue, x, y, title, description, and authorName are required',
    });
  }

  try {
    const db = await useDb();

    // Ensure map_seed exists, create if not
    const [existingSeeds] = await db.query(
      'SELECT id FROM map_seeds WHERE seed_value = ?',
      [body.seedValue]
    );

    let mapSeedId: number;

    if (Array.isArray(existingSeeds) && existingSeeds.length > 0) {
      mapSeedId = (existingSeeds[0] as { id: number }).id;
    } else {
      const [result] = await db.execute(
        'INSERT INTO map_seeds (seed_value) VALUES (?)',
        [body.seedValue]
      );
      mapSeedId = (result as { insertId: number }).insertId;
    }

    // Insert the bench
    await db.execute(
      'INSERT INTO stoner_benches (map_seed_id, x, y, title, description, author_name) VALUES (?, ?, ?, ?, ?, ?)',
      [mapSeedId, body.x, body.y, body.title, body.description, body.authorName]
    );

    return { success: true };
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error saving bench',
    });
  }
});
