const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// =========================
// Middleware
// =========================
function isAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// =========================
// Home
// =========================
router.get('/', (req, res) => {
  res.redirect('/login');
});

// =========================
// Register
// =========================
router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.send('Email already registered');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users(name,email,password,verify_token) VALUES($1,$2,$3,$4)',
      [name, email, hash, token]
    );

    res.send(`
      Registration successful.<br>
      Click to verify your account:<br>
      <a href="/verify/${token}">Verify Email</a>
    `);

  } catch (err) {
    console.error(err);
    res.send('Registration Error');
  }
});

// =========================
// Email Verification
// =========================
router.get('/verify/:token', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET verified=true, verify_token=NULL WHERE verify_token=$1 RETURNING *',
      [req.params.token]
    );

    if (result.rowCount === 0) {
      return res.send('Invalid or Expired Verification Link');
    }

    res.send(`
      Email verified successfully.<br>
      <a href="/login">Login Now</a>
    `);

  } catch (err) {
    console.error(err);
    res.send('Verification Error');
  }
});

// =========================
// Login
// =========================
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.send('Invalid Email or Password');
    }

    const user = result.rows[0];

    if (!user.verified) {
      return res.send('Please verify your email first');
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.send('Invalid Email or Password');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.send('Login Error');
  }
});

// =========================
// Dashboard
// =========================
router.get('/dashboard', isAuth, (req, res) => {
  res.send(`
    Welcome ${req.session.user.name}<br>
    <a href="/logout">Logout</a>
  `);
});

// =========================
// Logout
// =========================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
