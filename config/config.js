// config/config.js
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  jwtCookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE || '30', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tok'
};

module.exports = config;