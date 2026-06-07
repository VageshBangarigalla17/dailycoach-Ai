const mongoose = require('mongoose');
const User = require('./models/User');

const checkTokens = async () => {
  try {
    await mongoose.connect('mongodb+srv://giri:AMMANANNA1@friendstoursandtravels.h9rguzx.mongodb.net/dailycoach-Ai?appName=FriendsToursAndTravels');
    console.log('Connected to DB');
    
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    let tokensFound = 0;
    users.forEach(u => {
      console.log(`User ${u.email}: fcmToken is ${u.fcmToken ? 'SET (' + u.fcmToken.substring(0,10) + '...)' : 'MISSING'}`);
      if (u.fcmToken) tokensFound++;
    });
    
    console.log(`Total users with FCM tokens: ${tokensFound}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkTokens();
