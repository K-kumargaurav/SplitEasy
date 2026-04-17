const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {expiresIn : "7d" }
    );
};

// @POST /api/auth/register
const register = async(req, res) => {
    try{
        const { name, email, password, country } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.status(400).json({ message: "Email already exist" });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
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
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                bio: user.bio,
                profilePhoto: user.profilePhoto,
                isOnline: user.isOnline,
                country: user.country,
            }
        });
    }catch(error){
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @POST /api/auth/login
const login = async(req, res) => {
    try{
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        user.isOnline = true;
        await user.save();

        res.json({
            message: "Login successful",
            token: generateToken(user._id),
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                bio: user.bio,
                profilePhoto: user.profilePhoto,
                isOnline: user.isOnline,
                country: user.country || "India",
            }
        });
    }catch(error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { register, login };
