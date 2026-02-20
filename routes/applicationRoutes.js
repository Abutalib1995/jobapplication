const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const PDFDocument = require('pdfkit');

function generateId() {
  return 'APP' + Math.floor(100000 + Math.random() * 900000);
}

// Home redirect
router.get('/', (req, res) => res.redirect('/apply'));

// Apply Form
router.get('/apply', (req, res) => res.render('apply'));

router.post('/apply', async (req, res) => {
  const id = generateId();

  await pool.query(
    'INSERT INTO applications(application_id, name, phone, email, position) VALUES($1,$2,$3,$4,$5)',
    [id, req.body.name, req.body.phone, req.body.email, req.body.position]
  );

  res.redirect(`/download/${id}`);
});

// Search
router.get('/search', (req, res) => res.render('search'));

router.post('/search', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE application_id=$1',
    [req.body.applicationId]
  );

  if (result.rows.length === 0) return res.send("Application Not Found");

  res.redirect(`/download/${req.body.applicationId}`);
});

// Download PDF
router.get('/download/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE application_id=$1',
    [req.params.id]
  );

  if (result.rows.length === 0) return res.send("Application Not Found");

  const app = result.rows[0];

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=application.pdf');

  doc.pipe(res);
  doc.text(`Application ID: ${app.application_id}`);
  doc.text(`Name: ${app.name}`);
  doc.text(`Phone: ${app.phone}`);
  doc.text(`Email: ${app.email}`);
  doc.text(`Position: ${app.position}`);
  doc.end();
});

// ---------------- ADMIN PANEL ----------------

// View All
router.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
  res.render('admin', { applications: result.rows });
});

// Edit Page
router.get('/admin/edit/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM applications WHERE id=$1', [req.params.id]);
  if (result.rows.length === 0) return res.send("Not Found");
  res.render('edit', { app: result.rows[0] });
});

// Update
router.post('/admin/update/:id', async (req, res) => {
  await pool.query(
    'UPDATE applications SET name=$1, phone=$2, email=$3, position=$4 WHERE id=$5',
    [req.body.name, req.body.phone, req.body.email, req.body.position, req.params.id]
  );
  res.redirect('/admin');
});

// Delete
router.get('/admin/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
  res.redirect('/admin');
});

module.exports = router;
