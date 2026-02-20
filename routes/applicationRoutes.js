const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const PDFDocument = require('pdfkit');

function generateId() {
  return 'APP' + Math.floor(100000 + Math.random() * 900000);
}

router.get('/', (req, res) => {
  res.redirect('/apply');
});

router.get('/apply', (req, res) => {
  res.render('apply');
});

router.post('/apply', async (req, res) => {
  const id = generateId();

  await pool.query(
    'INSERT INTO applications(application_id, name, phone, email, position) VALUES($1,$2,$3,$4,$5)',
    [id, req.body.name, req.body.phone, req.body.email, req.body.position]
  );

  res.redirect(`/download/${id}`);
});

router.get('/search', (req, res) => {
  res.render('search');
});

router.post('/search', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE application_id=$1',
    [req.body.applicationId]
  );

  if (result.rows.length === 0) {
    return res.send("Application Not Found");
  }

  res.redirect(`/download/${req.body.applicationId}`);
});

router.get('/download/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM applications WHERE application_id=$1',
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.send("Application Not Found");
  }

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

module.exports = router;
