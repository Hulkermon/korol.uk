export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();

    const [seeds] = await db.query(
      'SELECT id, seed_value, created_at FROM map_seeds ORDER BY created_at DESC LIMIT 1'
    );

    let currentSeed: string | null = null;
    let shouldCreateNew = true;

    if (Array.isArray(seeds) && seeds.length > 0) {
      const latest = seeds[0] as { id: number; seed_value: string; created_at: Date };
      const now = new Date();
      const diff = now.getTime() - new Date(latest.created_at).getTime();
      const hours = diff / (1000 * 60 * 60);

      if (hours < 24) {
        currentSeed = latest.seed_value;
        shouldCreateNew = false;
      }
    }

    if (shouldCreateNew) {
      // Generate new seed
      const newSeedValue = Math.random().toString(36).substring(2, 15);
      
      // Insert new seed
      await db.execute(
        'INSERT INTO map_seeds (seed_value) VALUES (?)',
        [newSeedValue]
      );
      
      currentSeed = newSeedValue;
    }

    return { seed: currentSeed };
  } catch (error) {
    console.error('Database error:', error);
    // Don't fail hard, just return null so frontend generates a random one
    return { seed: null };
  }
});
