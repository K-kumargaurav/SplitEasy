const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

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

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

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

// @POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, country } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const username = await generateUsername(name);

    const user = await User.create({
      name,
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    user.isOnline = true;
    await user.save();

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // New user — create account
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
      // Existing email account — link googleId
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
    res.status(401).json({ message: "Google authentication failed", error: error.message });
  }
};

module.exports = { register, login, googleAuth };
