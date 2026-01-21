export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();
    
    // Increment the counter
    await db.execute('UPDATE visitor_counter SET count = count + 1 WHERE name = ?', ['homepage']);
    
    // Get the new count
    const [rows] = await db.execute('SELECT count FROM visitor_counter WHERE name = ?', ['homepage']);
    
    if (Array.isArray(rows) && rows.length > 0) {
      return { count: (rows[0] as any).count };
    }
    
    return { count: 0 };
  } catch (error) {
    console.error('Database error in visit counter:', error);
    // Fail silently rather than crashing the page load, return default
    return { count: 0 };
  }
});
