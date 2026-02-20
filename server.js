require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { initDB } = require('./db');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.use('/', applicationRoutes);

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Database initialization failed:", err);
});
