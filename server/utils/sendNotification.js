const Notification = require("../models/Notification");

const sendNotification = async (userId, message) => {
  try {
    await Notification.create({ userId, message });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

module.exports = sendNotification;
