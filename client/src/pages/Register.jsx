import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";

/* ─────────────────────────────────────────
   Shared input component
───────────────────────────────────────── */

function InputField({ label, ...props }) {
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
   Register Page
───────────────────────────────────────── */

const COUNTRIES = [
  { name: "India", flag: "🇮🇳" }, { name: "United States", flag: "🇺🇸" },
  { name: "United Kingdom", flag: "🇬🇧" }, { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" }, { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" }, { name: "Japan", flag: "🇯🇵" },
  { name: "China", flag: "🇨🇳" }, { name: "Brazil", flag: "🇧🇷" },
  { name: "Russia", flag: "🇷🇺" }, { name: "South Korea", flag: "🇰🇷" },
  { name: "Italy", flag: "🇮🇹" }, { name: "Spain", flag: "🇪🇸" },
  { name: "Mexico", flag: "🇲🇽" }, { name: "Indonesia", flag: "🇮🇩" },
  { name: "Netherlands", flag: "🇳🇱" }, { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Turkey", flag: "🇹🇷" }, { name: "Switzerland", flag: "🇨🇭" },
  { name: "Argentina", flag: "🇦🇷" }, { name: "Sweden", flag: "🇸🇪" },
  { name: "Poland", flag: "🇵🇱" }, { name: "Belgium", flag: "🇧🇪" },
  { name: "Thailand", flag: "🇹🇭" }, { name: "Nigeria", flag: "🇳🇬" },
  { name: "UAE", flag: "🇦🇪" }, { name: "Singapore", flag: "🇸🇬" },
  { name: "Malaysia", flag: "🇲🇾" }, { name: "Pakistan", flag: "🇵🇰" },
  { name: "Bangladesh", flag: "🇧🇩" }, { name: "Vietnam", flag: "🇻🇳" },
  { name: "Philippines", flag: "🇵🇭" }, { name: "Egypt", flag: "🇪🇬" },
  { name: "Iran", flag: "🇮🇷" }, { name: "Iraq", flag: "🇮🇶" },
  { name: "South Africa", flag: "🇿🇦" }, { name: "Colombia", flag: "🇨🇴" },
  { name: "Ukraine", flag: "🇺🇦" }, { name: "Romania", flag: "🇷🇴" },
  { name: "New Zealand", flag: "🇳🇿" }, { name: "Nepal", flag: "🇳🇵" },
  { name: "Sri Lanka", flag: "🇱🇰" }, { name: "Other", flag: "🌍" },
];

export default function Register() {
  const [form, setForm]                 = useState({ name: "", email: "", password: "", country: "India" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]
                    flex flex-col items-center justify-center px-4 py-10">

      <ThemeToggle />

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
          Split bills, not friendships
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <InputField
            label="Full Name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange("name")}
            autoComplete="name"
            autoFocus
            required
          />

          <InputField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange("email")}
            autoComplete="email"
            required
          />

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Country
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none select-none">
                {COUNTRIES.find((c) => c.name === form.country)?.flag || "🌍"}
              </span>
              <select
                value={form.country}
                onChange={handleChange("country")}
                className="w-full h-12 bg-white dark:bg-[#3a3a3c] border border-gray-200
                           dark:border-[#48484a] rounded-xl pl-10 pr-4 text-base
                           text-gray-900 dark:text-white
                           focus:outline-none focus:border-emerald-500 focus:ring-2
                           focus:ring-emerald-500/20 transition appearance-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Password with show/hide toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange("password")}
                autoComplete="new-password"
                minLength={6}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                       rounded-xl text-base font-semibold transition
                       disabled:opacity-50 select-none touch-manipulation"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="border-t border-gray-100 dark:border-[#3a3a3c] px-5 py-4
                        text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-600 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
