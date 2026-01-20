export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();

    const [seeds] = await db.query(
      'SELECT id, seed_value, created_at, next_refresh FROM map_seeds ORDER BY created_at DESC LIMIT 1'
    );

    let currentSeed: string | null = null;
    let nextRefreshSeconds: number = 0;
    
    const nowSeconds = Math.floor(Date.now() / 1000);
    let shouldUseRef = false;

    if (Array.isArray(seeds) && seeds.length > 0) {
      const latest = seeds[0] as { id: number; seed_value: string; created_at: Date; next_refresh: number | null };
      
      // Migration/Fallback: If next_refresh is missing, calculate it from created_at once
      if (!latest.next_refresh) {
        const createdAtSeconds = Math.floor(new Date(latest.created_at).getTime() / 1000);
        const calculatedRefresh = createdAtSeconds + (24 * 60 * 60);
        
        // If it should still be active
        if (calculatedRefresh > nowSeconds) {
           // Update DB
           await db.execute('UPDATE map_seeds SET next_refresh = ? WHERE id = ?', [calculatedRefresh, latest.id]);
           latest.next_refresh = calculatedRefresh;
        }
      }

      if (latest.next_refresh && latest.next_refresh > nowSeconds) {
        currentSeed = latest.seed_value;
        nextRefreshSeconds = latest.next_refresh;
        shouldUseRef = true;
      }
    }

    if (!shouldUseRef) {
      // Generate new seed
      const newSeedValue = Math.random().toString(36).substring(2, 15);
      nextRefreshSeconds = nowSeconds + (24 * 60 * 60);
      
      // Insert new seed
      await db.execute(
        'INSERT INTO map_seeds (seed_value, next_refresh) VALUES (?, ?)',
        [newSeedValue, nextRefreshSeconds]
      );
      
      currentSeed = newSeedValue;
    }

    return { seed: currentSeed, nextRefresh: nextRefreshSeconds };
  } catch (error) {
    console.error('Database error:', error);
    // Don't fail hard, just return null so frontend generates a random one
    return { seed: null, nextRefresh: null };
  }
});
