const express = require("express");
const router = express.Router();
const { register, login, googleAuth, registerValidation, loginValidation } = require("../controllers/authController");

router.post("/register", registerValidation, register);
router.post("/login",    loginValidation,    login);
router.post("/google",                       googleAuth);

module.exports = router;
