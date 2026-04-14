const User = require("../models/User");

const sendNotification = async (userId, message) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.notifications.unshift({ message }); // newest first
    if (user.notifications.length > 50) {
      user.notifications = user.notifications.slice(0, 50); // cap at 50
    }
    await user.save();
  } catch (error) {
    console.error("Notification error:", error.message);
  }
};

module.exports = sendNotification;