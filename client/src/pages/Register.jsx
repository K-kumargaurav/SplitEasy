import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

/* ─────────────────────────────────────────
   Shared input component
───────────────────────────────────────── */

function InputField({ label, ...props }) {
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
    </div>
  );
}

/* ─────────────────────────────────────────
   Register Page
───────────────────────────────────────── */

export default function Register() {
  const [form, setForm]             = useState({ name: "", email: "", password: "" });
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

        {error && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
            <span className="text-red-500 text-sm">⚠</span>
            <p className="text-red-600 text-sm">{error}</p>
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

          {/* Password with show/hide toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
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

        <div className="border-t border-gray-100 px-5 py-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-600 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
