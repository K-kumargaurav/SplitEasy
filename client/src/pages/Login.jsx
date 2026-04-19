import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { GoogleLogin } from "@react-oauth/google";
import api from "../utils/api";

/* ─────────────────────────────────────────
   Small reusable pieces (local to this file)
───────────────────────────────────────── */

function InputField({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        className="w-full h-12 bg-white dark:bg-[#3a3a3c] border border-gray-200
                   dark:border-[#48484a] rounded-xl px-4 text-base
                   text-gray-900 dark:text-white placeholder-gray-400
                   dark:placeholder-gray-500
                   focus:outline-none focus:border-emerald-500 focus:ring-2
                   focus:ring-emerald-500/20 transition"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
                 rounded-full bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur
                 border border-gray-200 dark:border-[#3a3a3c] shadow-sm
                 touch-manipulation transition"
      aria-label="Toggle dark mode"
    >
      {dark ? (
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0
                   01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894
                   6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06
                   1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0
                   010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0
                   001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59
                   1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5
                   0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06
                   1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6
                   12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016
                   12zM6.166 6.166a.75.75 0 011.06-1.06l1.591 1.59a.75.75 0
                   01-1.061 1.061l-1.59-1.59z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0
                 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0
                 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799
                 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112
                 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────
   Login Page
───────────────────────────────────────── */

export default function Login() {
  const [form, setForm]                 = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [step, setStep]                 = useState("form");
  const [otp, setOtp]                   = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [forgotStep,   setForgotStep]   = useState(null); // null | "email" | "otp"
  const [forgotEmail,  setForgotEmail]  = useState("");
  const [forgotOtp,    setForgotOtp]    = useState("");
  const [newPassword,  setNewPassword]  = useState("");
  const [showNewPass,  setShowNewPass]  = useState(false);
  const [resetDone,    setResetDone]    = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();
  const { t, lang, toggleLang } = useLanguage();

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleGoogleSuccess = async ({ credential }) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/google", { credential });
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || t("login.google_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-login-otp", form);
      setPendingEmail(form.email.toLowerCase().trim());
      setStep("otp");
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verify-login-otp", { email: pendingEmail, otp });
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setForgotStep("email");
    setForgotEmail(form.email);
    setForgotOtp("");
    setNewPassword("");
    setResetDone(false);
    setError("");
  };

  const handleForgotSendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotStep("otp");
      setForgotOtp("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { email: forgotEmail, otp: forgotOtp, newPassword });
      setResetDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]
                    flex flex-col items-center justify-center px-4 py-10">

      <ThemeToggle />

      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 left-4 h-9 px-3 flex items-center justify-center
                   rounded-full bg-white/80 dark:bg-[#2c2c2e]/80 backdrop-blur
                   border border-gray-200 dark:border-[#3a3a3c] shadow-sm
                   text-xs font-semibold text-gray-600 dark:text-gray-300
                   touch-manipulation transition"
      >
        {lang === "en" ? "हिं" : "EN"}
      </button>

      {/* Brand */}
      <div className="mb-8 text-center select-none">
        <div className="w-20 h-20 mx-auto mb-4 rounded-[28px] bg-emerald-500
                        flex items-center justify-center shadow-lg shadow-emerald-200">
          <span className="text-4xl">💸</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          SplitEasy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("login.tagline")}
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white dark:bg-[#2c2c2e] rounded-2xl
                      shadow-sm overflow-hidden">

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100
                          dark:border-red-800/30 px-4 py-3 flex items-center gap-2">
            <span className="text-red-500 text-sm">⚠</span>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {forgotStep !== null ? (
          <div className="p-5 space-y-5">
            {resetDone ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20
                                  flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Password reset!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">You can now sign in with your new password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setForgotStep(null); setError(""); }}
                  className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                             rounded-xl text-base font-semibold transition select-none touch-manipulation"
                >
                  Back to Sign In
                </button>
              </>
            ) : forgotStep === "email" ? (
              <>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Reset your password</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your email and we'll send a reset code.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full h-12 bg-white dark:bg-[#3a3a3c] border border-gray-200
                               dark:border-[#48484a] rounded-xl px-4 text-base
                               text-gray-900 dark:text-white placeholder-gray-400
                               focus:outline-none focus:border-emerald-500 focus:ring-2
                               focus:ring-emerald-500/20 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleForgotSendOtp}
                  disabled={loading || !forgotEmail}
                  className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                             rounded-xl text-base font-semibold transition
                             disabled:opacity-50 select-none touch-manipulation"
                >
                  {loading ? "Sending…" : "Send Reset Code"}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotStep(null); setError(""); }}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 text-center
                             hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  ← Back to Sign In
                </button>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20
                                  flex items-center justify-center">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Check your email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Code sent to <span className="font-semibold text-gray-700 dark:text-gray-200">{forgotEmail}</span>
                  </p>
                </div>

                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  className="w-full h-14 bg-white dark:bg-[#3a3a3c] border border-gray-200
                             dark:border-[#48484a] rounded-xl px-4 text-2xl font-bold
                             tracking-widest text-center text-gray-900 dark:text-white
                             focus:outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 transition"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-12 bg-white dark:bg-[#3a3a3c] border border-gray-200
                                 dark:border-[#48484a] rounded-xl px-4 pr-12 text-base
                                 text-gray-900 dark:text-white placeholder-gray-400
                                 focus:outline-none focus:border-emerald-500 focus:ring-2
                                 focus:ring-emerald-500/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1"
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForgotReset}
                  disabled={loading || forgotOtp.length !== 6 || newPassword.length < 8}
                  className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                             rounded-xl text-base font-semibold transition
                             disabled:opacity-50 select-none touch-manipulation"
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setForgotStep("email"); setForgotOtp(""); setError(""); }}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotSendOtp}
                    disabled={loading}
                    className="text-emerald-600 font-medium disabled:opacity-50 transition"
                  >
                    Resend Code
                  </button>
                </div>
              </>
            )}
          </div>
        ) : step === "otp" ? (
          <div className="p-5 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20
                              flex items-center justify-center">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Check your email</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We sent a 6-digit code to<br />
                <span className="font-semibold text-gray-700 dark:text-gray-200">{pendingEmail}</span>
              </p>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              className="w-full h-14 bg-white dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-2xl font-bold
                         tracking-widest text-center text-gray-900 dark:text-white
                         focus:outline-none focus:border-emerald-500 focus:ring-2
                         focus:ring-emerald-500/20 transition"
            />

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                         rounded-xl text-base font-semibold transition
                         disabled:opacity-50 select-none touch-manipulation"
            >
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setError(""); }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="text-emerald-600 font-medium disabled:opacity-50 transition"
              >
                Resend OTP
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <InputField
              label={t("login.email")}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange("email")}
              autoComplete="email"
              autoFocus
              required
            />

            {/* Password with show/hide toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                {t("login.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={showPassword ? t("login.password") : "••••••••"}
                  value={form.password}
                  onChange={handleChange("password")}
                  autoComplete="current-password"
                  required
                  className="w-full h-12 bg-white dark:bg-[#3a3a3c] border border-gray-200
                             dark:border-[#48484a] rounded-xl px-4 pr-12 text-base
                             text-gray-900 dark:text-white placeholder-gray-400
                             dark:placeholder-gray-500
                             focus:outline-none focus:border-emerald-500 focus:ring-2
                             focus:ring-emerald-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                             transition p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={openForgot}
                className="text-xs text-emerald-600 font-medium hover:underline touch-manipulation"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                         rounded-xl text-base font-semibold transition
                         disabled:opacity-50 disabled:cursor-not-allowed select-none
                         touch-manipulation"
            >
              {loading ? "Sending OTP…" : t("login.sign_in")}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-[#3a3a3c]" />
              <span className="text-xs text-gray-400 select-none">{t("login.or")}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-[#3a3a3c]" />
            </div>

            {/* Google login */}
            <div className={`flex justify-center ${loading ? "pointer-events-none opacity-50" : ""}`}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError(t("login.google_failed"))}
                theme="outline"
                shape="rectangular"
                size="large"
                width="100%"
                text="signin_with"
              />
            </div>
          </form>
        )}

        {step === "form" && forgotStep === null && (
          <div className="border-t border-gray-100 dark:border-[#3a3a3c] px-5 py-4
                          text-center text-sm text-gray-500 dark:text-gray-400">
            {t("login.no_account")}{" "}
            <Link to="/register" className="text-emerald-600 font-semibold">
              {t("login.register")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
