const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const adminRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
const ejs = require('ejs')
const app = express();
const db=require('./config/connection')
const session = require('express-session')
const flash=require('connect-flash')
const multer  = require('multer')
const Razorpay = require('razorpay')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

db.connect((err)=>{
  if(err) console.log('Connection_Error'+err)
  else console.log('Data base connected succesfully')
})
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'reggnifniwuiinvuiwf',
  resave: true,
  saveUninitialized: true,
  cookie:{maxAge:60000*60*24*7}
}))
app.use((req,res,next)=>{
  res.set('Cache-Control','no-store')
  next()
})
app.use(flash())
// app.use(express.urlencoded({ extended: false }))
// app.use(fileUpload())
app.use('/', usersRouter);
app.use('/admin', adminRouter); 


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

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
