const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentStreakDays: { type: Number, default: 0 },
  longestStreakDays: { type: Number, default: 0 },
  totalTasksCompleted: { type: Number, default: 0 },
  completionPercentageThisWeek: { type: Number, default: 0 },
  bestPerformedTask: { type: String, default: 'None' },
  mostMissedTask: { type: String, default: 'None' },
  lastUpdated: { type: Date, default: Date.now }
});

userStatsSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('UserStats', userStatsSchema);
