export default defineEventHandler(async (event) => {
  try {
    const db = await useDb();
    const [rows] = await db.query('SELECT * FROM guestbook_entries ORDER BY timestamp DESC');
    return rows;
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error fetching guestbook entries',
    });
  }
});
