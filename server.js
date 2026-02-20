require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { initDB } = require('./db');
const routes = require('./routes/applicationRoutes');

const app = express();

app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.static('public'));

app.use(session({
  secret:'secretkey',
  resave:false,
  saveUninitialized:false
}));

app.set('view engine','ejs');
app.use('/',routes);

const PORT = process.env.PORT || 3000;

initDB().then(()=>{
  app.listen(PORT,()=>console.log("Server Running With Users"));
});
