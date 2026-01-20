import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const useDb = async () => {
  if (!pool) {
    const config = useRuntimeConfig();

    // Fallback to process.env if runtimeConfig is missing
    const dbConfig = {
      host: config.db.host || process.env.MYSQL_HOST,
      user: config.db.user || process.env.MYSQL_USER,
      password: config.db.password || process.env.MYSQL_PASSWORD,
      database: config.db.database || process.env.MYSQL_DATABASE,
    };
    
    try {
      const connection = await mysql.createConnection(dbConfig);
      
      // 2. Ensure Tables Exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS guestbook_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          style VARCHAR(50),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS map_seeds (
          id INT AUTO_INCREMENT PRIMARY KEY,
          seed_value VARCHAR(255) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS stoner_benches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          map_seed_id INT NOT NULL,
          x INT NOT NULL,
          y INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          author_name VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (map_seed_id) REFERENCES map_seeds(id) ON DELETE CASCADE
        )
      `);
      
      await connection.end();

      // 3. Create Pool for the specific database
      pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    } catch (error) {
      console.error('[DB] Error initializing database:', error);
      throw error;
    }
  }
  return pool;
};
