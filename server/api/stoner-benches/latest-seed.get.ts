export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();

    const [seeds] = await db.query(
      'SELECT seed_value FROM map_seeds ORDER BY created_at DESC LIMIT 1'
    );

    if (Array.isArray(seeds) && seeds.length > 0) {
      return { seed: (seeds[0] as { seed_value: string }).seed_value };
    }

    return { seed: null };
  } catch (error) {
    console.error('Database error:', error);
    // Don't fail hard, just return null so frontend generates a random one
    return { seed: null };
  }
});
