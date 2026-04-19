const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");
const sendEmail = require("../utils/sendEmail");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateUsername = async (name) => {
  const base = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
  let username, exists;
  do {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    username = `${base}${suffix}`;
    exists = await User.findOne({ username });
  } while (exists);
  return username;
};

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  bio: user.bio,
  profilePhoto: user.profilePhoto,
  isOnline: user.isOnline,
  country: user.country || "India",
});

/* ── Validation rules ── */
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 60 }),
  body("email").trim().toLowerCase().isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
];

const loginValidation = [
  body("email").trim().toLowerCase().isEmail(),
  body("password").notEmpty(),
];

// @POST /api/auth/register
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  try {
    const { name, password, country } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const username = await generateUsername(name);

    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      username,
      isOnline: true,
      country: country || "India",
      emailVerified: true,
    });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("register:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: "Invalid email or password" });

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;

    const user = await User.findOne({ email });
    // Generic message to prevent user enumeration
    if (!user || !user.password)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    user.isOnline = true;
    await user.save();

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("login:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// @POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ message: "Google credential required" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, name, picture } = ticket.getPayload();
    const email = ticket.getPayload().email.toLowerCase().trim();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const username = await generateUsername(name);
      user = await User.create({
        googleId,
        email,
        name,
        username,
        profilePhoto: picture || "",
        isOnline: true,
        country: "India",
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.profilePhoto && picture) user.profilePhoto = picture;
      user.isOnline = true;
      await user.save();
    }

    res.json({
      message: "Google login successful",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("googleAuth:", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
};

const otpEmailHtml = (otp, subject) => `
  <div style="font-family:sans-serif;max-width:400px;margin:auto">
    <h2 style="color:#10b981">SplitEasy</h2>
    <p>${subject}</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                color:#111;background:#f3f4f6;padding:16px 24px;
                border-radius:12px;text-align:center;margin:16px 0">
      ${otp}
    </div>
    <p style="color:#6b7280;font-size:13px">
      Expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.
    </p>
  </div>
`;

// @POST /api/auth/send-register-otp
const sendRegisterOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  try {
    const { name, password, country } = req.body;
    const email = req.body.email.toLowerCase().trim();

    let user = await User.findOne({ email });
    if (user && user.emailVerified)
      return res.status(400).json({ message: "Email already registered" });

    const otp = String(crypto.randomInt(100000, 999999));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    if (!user) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const username = await generateUsername(name);
      user = await User.create({
        name: name.trim(), email, password: hashedPassword, username,
        country: country || "India",
        emailVerified: false, emailOtp: otp, emailOtpExpiry: otpExpiry,
      });
    } else {
      // Resend — refresh OTP and update form data in case user corrected it
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.name = name.trim();
      user.password = hashedPassword;
      user.country = country || "India";
      user.emailOtp = otp;
      user.emailOtpExpiry = otpExpiry;
      await user.save();
    }

    await sendEmail({
      to: email,
      subject: "SplitEasy — Verify your email",
      html: otpEmailHtml(otp, "Your one-time code to verify your email:"),
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("sendRegisterOtp:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @POST /api/auth/verify-register-otp
const verifyRegisterOtp = async (req, res) => {
  try {
    const { email: rawEmail, otp } = req.body;
    if (!rawEmail || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const email = rawEmail.toLowerCase().trim();
    const user = await User.findOne({ email, emailVerified: false });
    if (!user)
      return res.status(400).json({ message: "No pending verification found" });

    if (!user.emailOtp || user.emailOtp !== String(otp).trim())
      return res.status(400).json({ message: "Invalid OTP" });
    if (!user.emailOtpExpiry || user.emailOtpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    user.emailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiry = undefined;
    user.isOnline = true;
    await user.save();

    res.status(201).json({
      message: "Email verified successfully",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (err) {
    console.error("verifyRegisterOtp:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// @POST /api/auth/send-login-otp
const sendLoginOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: "Invalid email or password" });

  try {
    const email = req.body.email.toLowerCase().trim();
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const otp = String(crypto.randomInt(100000, 999999));
    user.emailOtp = otp;
    user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: email,
      subject: "SplitEasy — Login OTP",
      html: otpEmailHtml(otp, "Your one-time code to sign in:"),
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("sendLoginOtp:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @POST /api/auth/verify-login-otp
const verifyLoginOtp = async (req, res) => {
  try {
    const { email: rawEmail, otp } = req.body;
    if (!rawEmail || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const email = rawEmail.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    if (!user.emailOtp || user.emailOtp !== String(otp).trim())
      return res.status(400).json({ message: "Invalid OTP" });
    if (!user.emailOtpExpiry || user.emailOtpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    user.emailOtp = undefined;
    user.emailOtpExpiry = undefined;
    user.isOnline = true;
    await user.save();

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (err) {
    console.error("verifyLoginOtp:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

// @POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    // Generic response to prevent user enumeration
    if (!user || !user.password) {
      return res.json({ message: "If that email exists, an OTP has been sent" });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    user.passwordOtp = otp;
    user.passwordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: email,
      subject: "SplitEasy — Password Reset OTP",
      html: otpEmailHtml(otp, "Your one-time code to reset your password:"),
    });

    res.json({ message: "If that email exists, an OTP has been sent" });
  } catch (err) {
    console.error("forgotPassword:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// @POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;
    if (!rawEmail || !otp || !newPassword || newPassword.length < 8)
      return res.status(400).json({ message: "Email, OTP, and new password (min 8 chars) are required" });

    const email = rawEmail.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid OTP" });

    if (!user.passwordOtp || user.passwordOtp !== String(otp).trim())
      return res.status(400).json({ message: "Invalid OTP" });
    if (!user.passwordOtpExpiry || user.passwordOtpExpiry < new Date())
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordOtp = undefined;
    user.passwordOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("resetPassword:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register, login, googleAuth, registerValidation, loginValidation,
  sendRegisterOtp, verifyRegisterOtp, sendLoginOtp, verifyLoginOtp,
  forgotPassword, resetPassword,
};
