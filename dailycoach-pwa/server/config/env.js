if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGO_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_123',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
