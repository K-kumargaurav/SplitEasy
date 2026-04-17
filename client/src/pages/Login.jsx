import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

/* ─────────────────────────────────────────
   Small reusable pieces (local to this file)
───────────────────────────────────────── */

function InputField({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      <input
        className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4
                   text-base text-gray-900 placeholder-gray-400
                   focus:outline-none focus:border-emerald-500 focus:ring-2
                   focus:ring-emerald-500/20 transition"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PrimaryButton({ loading, children, ...props }) {
  return (
    <button
      className="w-full h-12 bg-emerald-500 active:bg-emerald-600 text-white
                 rounded-xl text-base font-semibold transition
                 disabled:opacity-50 disabled:cursor-not-allowed select-none
                 touch-manipulation"
      disabled={loading}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────
   Login Page
───────────────────────────────────────── */

export default function Login() {
  const [form, setForm]             = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efeff4] flex flex-col items-center justify-center px-4 py-10">

      {/* Brand */}
      <div className="mb-8 text-center select-none">
        <div className="w-20 h-20 mx-auto mb-4 rounded-[28px] bg-emerald-500
                        flex items-center justify-center shadow-lg shadow-emerald-200">
          <span className="text-4xl">💸</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SplitEasy</h1>
        <p className="text-sm text-gray-500 mt-1">Split bills, not friendships</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
            <span className="text-red-500 text-sm">⚠</span>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <InputField
            label="Email"
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
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange("password")}
                autoComplete="current-password"
                required
                className="w-full h-12 bg-white border border-gray-200 rounded-xl
                           px-4 pr-12 text-base text-gray-900 placeholder-gray-400
                           focus:outline-none focus:border-emerald-500 focus:ring-2
                           focus:ring-emerald-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-gray-400 hover:text-gray-600 transition p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <PrimaryButton loading={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </PrimaryButton>
        </form>

        <div className="border-t border-gray-100 px-5 py-4 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-emerald-600 font-semibold">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
