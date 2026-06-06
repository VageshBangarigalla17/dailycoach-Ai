const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  taskName: { type: String, required: true },
  description: { type: String },
  startTime: { type: String, required: true }, // HH:mm format
  endTime: { type: String, required: true }, // HH:mm format
  daysOfWeek: { type: [Number], required: true }, // 0=Sunday, 1=Monday...
  color: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'], default: 'morning' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Index for userId + taskName uniqueness per user
scheduleSchema.index({ userId: 1, taskName: 1 }, { unique: true });

// Custom toJSON to format output as expected by spec
scheduleSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
