const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const PDFDocument = require('pdfkit');

const upload = multer({ dest:'public/uploads/' });

function genId(){ return 'APP'+Math.floor(100000+Math.random()*900000); }

function isAuth(req,res,next){
  if(req.session.user) return next();
  res.redirect('/login');
}

function isAdmin(req,res,next){
  if(req.session.user && req.session.user.role==='admin') return next();
  res.redirect('/dashboard');
}

router.get('/',(req,res)=>res.redirect('/login'));

// ---------- Register ----------
router.get('/register',(req,res)=>res.render('register'));

router.post('/register',async (req,res)=>{
  const hash = await bcrypt.hash(req.body.password,10);
  await pool.query(
    'INSERT INTO users(name,email,password) VALUES($1,$2,$3)',
    [req.body.name,req.body.email,hash]
  );
  res.redirect('/login');
});

// ---------- Login ----------
router.get('/login',(req,res)=>res.render('login'));

router.post('/login',async (req,res)=>{
  const r = await pool.query('SELECT * FROM users WHERE email=$1',[req.body.email]);
  if(r.rows.length===0) return res.send("Invalid");
  const match = await bcrypt.compare(req.body.password,r.rows[0].password);
  if(match){
    req.session.user = r.rows[0];
    res.redirect('/dashboard');
  } else res.send("Invalid");
});

router.get('/logout',(req,res)=>{
  req.session.destroy(()=>res.redirect('/login'));
});

// ---------- Dashboard ----------
router.get('/dashboard',isAuth,async (req,res)=>{
  if(req.session.user.role==='admin'){
    const all = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
    return res.render('admin',{apps:all.rows,user:req.session.user});
  } else {
    const mine = await pool.query('SELECT * FROM applications WHERE user_id=$1 ORDER BY created_at DESC',[req.session.user.id]);
    return res.render('dashboard',{apps:mine.rows,user:req.session.user});
  }
});

// ---------- Apply ----------
router.get('/apply',isAuth,(req,res)=>res.render('apply'));

router.post('/apply',isAuth,upload.single('photo'),async (req,res)=>{
  const id = genId();
  await pool.query(
    'INSERT INTO applications(application_id,user_id,full_name,phone,email,position,photo) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [id,req.session.user.id,req.body.full_name,req.body.phone,req.body.email,req.body.position,req.file?.filename]
  );
  res.redirect('/view/'+id);
});

router.get('/view/:id',isAuth,async (req,res)=>{
  const r = await pool.query('SELECT * FROM applications WHERE application_id=$1',[req.params.id]);
  if(r.rows.length===0) return res.send("Not Found");
  res.render('view',{app:r.rows[0]});
});

router.get('/download/:id',isAuth,async (req,res)=>{
  const r = await pool.query('SELECT * FROM applications WHERE application_id=$1',[req.params.id]);
  if(r.rows.length===0) return res.send("Not Found");
  const app = r.rows[0];
  const doc = new PDFDocument();
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename=form.pdf');
  doc.pipe(res);
  doc.text("Application ID: "+app.application_id);
  doc.text("Name: "+app.full_name);
  doc.end();
});

router.get('/admin/delete/:id',isAdmin,async (req,res)=>{
  await pool.query('DELETE FROM applications WHERE id=$1',[req.params.id]);
  res.redirect('/dashboard');
});

module.exports = router;
