const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async(req, res, next) => {
    try{
        let token;

        // Check if token exists in headers
        if(req.headers.authorization && 
            req.headers.authorization.startsWith("Bearer")) {
                token = req.headers.authorization.split(" ")[1];
        }

        if(!token) {
            return res.status(401).json({ message : "Not authorised, no token" });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request (excluding password)
        req.user = await User.findById(decoded.id).select("-password");
        next();

    }catch(error) {
        res.status(401).json({ message: "Not authorised, invalid token" });
    }
};

module.exports = { protect };
