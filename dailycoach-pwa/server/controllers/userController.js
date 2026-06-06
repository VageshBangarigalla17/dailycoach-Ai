const UserStats = require('../models/UserStats');
const User = require('../models/User');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, preferredVoiceGender, preferredVoiceSpeed, enableNotifications, timezone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, preferredVoiceGender, preferredVoiceSpeed, enableNotifications, timezone },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user._id });
    
    if (!stats) {
      // Create default stats if not exists
      stats = await UserStats.create({ userId: req.user._id });
    }

    res.json({
      success: true,
      stats: stats.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStats
};
