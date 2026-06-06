const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  preferredVoiceGender: { type: String, enum: ['male', 'female'], default: 'female' },
  preferredVoiceSpeed: { type: Number, min: 0.5, max: 2.0, default: 1.0 },
  enableNotifications: { type: Boolean, default: true },
  timezone: { type: String, default: 'Asia/Kolkata' }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// We need to return id instead of _id to match API spec, so we configure toJSON
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash; // Don't expose password hash
  }
});

module.exports = mongoose.model('User', userSchema);
