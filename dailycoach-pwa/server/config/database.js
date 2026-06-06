const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB is already connected');
    return;
  }
  
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Don't process.exit(1) in serverless, just throw
    throw error;
  }
};

module.exports = connectDB;
