const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");

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
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
];

const loginValidation = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

// @POST /api/auth/register
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  try {
    const { name, email, password, country } = req.body;

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
    const { email, password } = req.body;

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

    const { sub: googleId, email, name, picture } = ticket.getPayload();

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

module.exports = { register, login, googleAuth, registerValidation, loginValidation };
