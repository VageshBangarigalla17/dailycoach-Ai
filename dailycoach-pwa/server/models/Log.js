const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  status: { type: String, required: true, enum: ['done', 'late', 'missed'] },
  scheduledTime: { type: String },
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
