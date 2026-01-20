import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const useDb = async () => {
  if (!pool) {
    const config = useRuntimeConfig();

    // Fallback to process.env if runtimeConfig is missing values (common issue in Docker/Nuxt)
    const dbConfig = {
      host: config.db.host || process.env.MYSQL_HOST,
      user: config.db.user || process.env.MYSQL_USER,
      password: config.db.password || process.env.MYSQL_PASSWORD,
      database: config.db.database || process.env.MYSQL_DATABASE,
    };

    console.log('[DB] Initializing database connection...');
    console.log('[DB] Configuration:', { 
      ...dbConfig, 
      password: dbConfig.password ? '******' : undefined 
    });
    
    try {
      // 1. Connect to MySQL server
      console.log('[DB] Creating initial connection to server...');
      const connection = await mysql.createConnection(dbConfig);
       console.log('[DB] Connected to server.');
      
      // 2. Ensure Table Exists
      console.log('[DB] Ensuring table "guestbook_entries" exists...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS guestbook_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          style VARCHAR(50),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('[DB] Table verified/created.');
      
      await connection.end();
      console.log('[DB] Initial connection closed.');

      // 3. Create Pool for the specific database
      console.log('[DB] Creating connection pool...');
      pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log('[DB] Connection pool ready.');
    } catch (error) {
      console.error('[DB] Error initializing database:', error);
      throw error;
    }
  }
  return pool;
};
