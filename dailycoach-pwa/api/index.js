// api/index.js — Vercel Serverless Function wrapper for Express backend
// This file wraps the Express app as a serverless function for Vercel deployment.
// DO NOT call app.listen() here — Vercel handles that.
// DO NOT start reminderScheduler here — use Firebase Cloud Functions for cron jobs.

const express = require('express');
const cors = require('cors');
const connectDB = require('../server/config/database');
const { errorHandler } = require('../server/middleware/errorHandler');

// Routes
const authRoutes = require('../server/routes/auth');
const scheduleRoutes = require('../server/routes/schedules');
const logRoutes = require('../server/routes/logs');
const userRoutes = require('../server/routes/users');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
