const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(150) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      application_id VARCHAR(20) UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(150),
      phone VARCHAR(50),
      email VARCHAR(150),
      position VARCHAR(100),
      photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminCheck = await pool.query("SELECT * FROM users WHERE email='admin@site.com'");
  if(adminCheck.rows.length === 0){
    const hash = await bcrypt.hash('admin123',10);
    await pool.query(
      "INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4)",
      ['Admin','admin@site.com',hash,'admin']
    );
    console.log("Default Admin: admin@site.com / admin123");
  }
}

module.exports = { pool, initDB };
