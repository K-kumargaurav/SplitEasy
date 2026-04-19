const express = require("express");
const router = express.Router();
const {
  register, login, googleAuth, registerValidation, loginValidation,
  sendRegisterOtp, verifyRegisterOtp, sendLoginOtp, verifyLoginOtp,
} = require("../controllers/authController");

router.post("/register",              registerValidation, register);
router.post("/login",                 loginValidation,    login);
router.post("/google",                                    googleAuth);
router.post("/send-register-otp",     registerValidation, sendRegisterOtp);
router.post("/verify-register-otp",                       verifyRegisterOtp);
router.post("/send-login-otp",        loginValidation,    sendLoginOtp);
router.post("/verify-login-otp",                          verifyLoginOtp);

module.exports = router;
