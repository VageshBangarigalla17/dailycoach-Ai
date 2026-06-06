const { NODE_ENV } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };
