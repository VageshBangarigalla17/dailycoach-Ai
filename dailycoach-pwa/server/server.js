const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

// Socket connections
io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);
  
  socket.on('register', (userId) => {
    console.log(`User ${userId} registered socket ${socket.id}`);
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Jobs (pass io instance)
startScheduler(io);

// Error Handling Middleware
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
