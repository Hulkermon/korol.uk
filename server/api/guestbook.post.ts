export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.name || !body.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and message are required',
    });
  }

  try {
    const db = await useDb();
    await db.execute(
      'INSERT INTO guestbook_entries (name, message, style, timestamp) VALUES (?, ?, ?, NOW())',
      [body.name, body.message, body.style || 'gb-style-win95']
    );
    return { success: true };
  } catch (error) {
    console.error('Database error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error saving guestbook entry',
    });
  }
});
