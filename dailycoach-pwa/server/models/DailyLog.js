const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  scheduledTime: { type: String, required: true }, // HH:mm
  actualCompletionTime: { type: String, default: null }, // HH:mm
  status: { type: String, enum: ['done', 'late', 'missed', 'no-response'], required: true },
  voiceResponse: { type: String, enum: ['yes', 'no', 'timeout'], required: true },
  notificationSentAt: { type: Date },
  completedAt: { type: Date, default: null },
  notes: { type: String }
});

// Indexes per spec
dailyLogSchema.index({ userId: 1, date: 1 });
dailyLogSchema.index({ userId: 1, scheduleId: 1, date: 1 }, { unique: true });

dailyLogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('DailyLog', dailyLogSchema);
