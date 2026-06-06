const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { PORT } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/users');
const startScheduler = require('./jobs/reminderScheduler');

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

// Start Jobs
startScheduler();

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
