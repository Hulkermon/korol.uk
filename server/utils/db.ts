import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const useDb = async () => {
  if (!pool) {
    const config = useRuntimeConfig();
    
    // 1. Connect to MySQL server (no DB selected yet)
    const connection = await mysql.createConnection(config.db);
    
    // 2. Ensure Table Exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guestbook_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        style VARCHAR(50),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.end();

    // 3. Create Pool for the specific database
    pool = mysql.createPool({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
};
