
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

function isAuth(req,res,next){
 if(req.session.user) return next();
 res.redirect('/login');
}

router.get('/',(req,res)=>res.redirect('/login'));

router.get('/register',(req,res)=>res.sendFile('register'));
router.post('/register',async (req,res)=>{
 const token = crypto.randomBytes(32).toString('hex');
 const hash = await bcrypt.hash(req.body.password,10);
 await pool.query(
  'INSERT INTO users(name,email,password,verify_token) VALUES($1,$2,$3,$4)',
  [req.body.name,req.body.email,hash,token]
 );
 res.send('Verify Email: /verify/'+token);
});

router.get('/verify/:token',async (req,res)=>{
 await pool.query(
  'UPDATE users SET verified=true, verify_token=NULL WHERE verify_token=$1',
  [req.params.token]
 );
 res.send('Email Verified. You can login now.');
});

router.get('/login',(req,res)=>res.sendFile('login'));
router.post('/login',async (req,res)=>{
 const r = await pool.query('SELECT * FROM users WHERE email=$1',[req.body.email]);
 if(r.rows.length===0) return res.send("Invalid");
 if(!r.rows[0].verified) return res.send("Verify Email First");
 const match = await bcrypt.compare(req.body.password,r.rows[0].password);
 if(match){
  req.session.user=r.rows[0];
  res.redirect('/dashboard');
 } else res.send("Invalid");
});

router.get('/dashboard',isAuth,(req,res)=>{
 res.send("Enterprise Dashboard Ready");
});

module.exports = router;
