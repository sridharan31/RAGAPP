var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const dotenv = require("dotenv").config()
const QdrantService = require('./services/qdrant');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var aiProvidersRouter = require('./routes/ai-providers');

var app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/ai-providers', aiProvidersRouter);

// Initialize Qdrant collections on startup
(async () => {
  try {
    console.log('🚀 Initializing Qdrant collections...');
    const qdrantService = new QdrantService();
    await qdrantService.initializeAllCollections();
    console.log('✅ Qdrant collections initialized successfully!');
  } catch (error) {
    console.warn('⚠️ Warning: Could not initialize Qdrant collections. Make sure Qdrant is running.');
    console.warn('Error:', error.message);
  }
})();

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
