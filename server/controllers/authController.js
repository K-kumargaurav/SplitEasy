const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.status(400).json({ message: "Email already exist" });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email, 
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email
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

        res.json({
            message: "Login successful",
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }catch(error) {
        res.status(500).json({ massage: "Server error", error: error.message });
    }
};

module.exports = { register, login };
