const User = require("../models/User");

const sendNotification = async (userId, message) => {
  try {
    const user = await User.findById(userId);

    if (!user) return;

    user.notifications.push({ message });
    await user.save();

  } catch (error) {
    console.error("Notification error:", error.message);
  }
};

module.exports = sendNotification;