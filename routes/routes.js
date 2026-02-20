const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');

const upload = multer({ dest: 'public/uploads/' });

// ================= Middleware =================
function isAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// ================= Home =================
router.get('/', (req, res) => {
  res.redirect('/login');
});

// ================= Register =================
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
      Click to verify:<br>
      <a href="/verify/${token}">Verify Email</a>
    `);

  } catch (err) {
    console.error(err);
    res.send('Registration Error');
  }
});

// ================= Verify =================
router.get('/verify/:token', async (req, res) => {
  await pool.query(
    'UPDATE users SET verified=true, verify_token=NULL WHERE verify_token=$1',
    [req.params.token]
  );

  res.send(`<a href="/login">Email Verified. Login Now</a>`);
});

// ================= Login =================
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

    if (result.rows.length === 0)
      return res.send('Invalid Login');

    const user = result.rows[0];

    if (!user.verified)
      return res.send('Verify Email First');

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.send('Invalid Login');

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

// ================= Dashboard =================
router.get('/dashboard', isAuth, async (req, res) => {
  const apps = await pool.query(
    'SELECT * FROM applications WHERE user_id=$1 ORDER BY created_at DESC',
    [req.session.user.id]
  );

  res.render('dashboard', {
    user: req.session.user,
    apps: apps.rows
  });
});

// ================= Apply Form =================
router.get('/apply', isAuth, (req, res) => {
  res.render('apply');
});

router.post('/apply', isAuth, upload.single('photo'), async (req, res) => {
  const id = 'APP' + Math.floor(100000 + Math.random() * 900000);

  await pool.query(
    `INSERT INTO applications
    (application_id,user_id,full_name,father_name,mother_name,dob,nid,phone,email,address,education,experience,skills,position,photo)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      req.session.user.id,
      req.body.full_name,
      req.body.father_name,
      req.body.mother_name,
      req.body.dob,
      req.body.nid,
      req.body.phone,
      req.body.email,
      req.body.address,
      req.body.education,
      req.body.experience,
      req.body.skills,
      req.body.position,
      req.file?.filename
    ]
  );

  res.redirect('/view/' + id);
});

// ================= CV View =================
router.get('/view/:id', isAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE application_id=$1',
    [req.params.id]
  );

  if (result.rows.length === 0)
    return res.send('Not Found');

  res.render('cv-view', {
    app: result.rows[0]
  });
});

// ================= Logout =================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
