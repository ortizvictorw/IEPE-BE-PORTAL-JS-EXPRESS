const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const createError = require('http-errors');
const indexRouter = require('./routes/index');
const memberRouter = require('./routes/member');
const db = require('./src/configurations/db.config');

dotenv.config({ path: '.env' });

const app = express();

(async () => {
  try {
    await db();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();

// Configuración del motor de vistas

app.use(logger('dev'));
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

// Rutas
app.use('/', indexRouter);
app.use('/members', memberRouter);

// Captura 404 y reenvía al manejador de errores
app.use(function(req, res, next) {
  next(createError(404));
});

// Manejador de errores
app.use(function(err, req, res, next) {
  // Proporciona error solo en desarrollo
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Renderiza la página de error
  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
