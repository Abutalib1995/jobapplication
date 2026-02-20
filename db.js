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
      name VARCHAR(150),
      email VARCHAR(150) UNIQUE,
      password VARCHAR(255),
      verified BOOLEAN DEFAULT FALSE,
      verify_token VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      application_id VARCHAR(20) UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(150),
      father_name VARCHAR(150),
      mother_name VARCHAR(150),
      dob VARCHAR(50),
      nid VARCHAR(50),
      phone VARCHAR(50),
      email VARCHAR(150),
      address TEXT,
      education TEXT,
      experience TEXT,
      skills TEXT,
      position VARCHAR(100),
      photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const admin = await pool.query("SELECT * FROM users WHERE email='admin@site.com'");
  if(admin.rows.length===0){
    const hash = await bcrypt.hash('admin123',10);
    await pool.query(
      "INSERT INTO users(name,email,password,verified,role) VALUES($1,$2,$3,$4,$5)",
      ['Administrator','admin@site.com',hash,true,'admin']
    );
  }
}

module.exports = { pool, initDB };
