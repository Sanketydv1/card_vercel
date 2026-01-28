"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { validateLogin, validateField } from "@/lib/validation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const router = useRouter();

  const runValidation = () => {
    const v = validateLogin({ email, password });
    setErrors(v);
    return v;
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const msg = validateField(field, field === "email" ? email : password);
    setErrors((e) => ({ ...e, [field]: msg }));
  };

  const handleChange = (field, value) => {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);

    // live-validate only if field has been touched
    if (touched[field]) {
      const msg = validateField(field, value);
      setErrors((e) => ({ ...e, [field]: msg }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validation = runValidation();
    if (Object.keys(validation).length) {
      // mark everything touched to show errors
      setTouched({ email: true, password: true });
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/auth/login", { email, password });
      toast.success(res.data?.message || "Login successful");
      router.push("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = () => {
    const v = validateLogin({ email, password });
    return Object.keys(v).length > 0;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--main-gradient)] p-6">
      <div className="w-full max-w-md bg-white/95 rounded-xl shadow-2xl border border-gray-200 p-8 relative">
        <div className="flex justify-center -mt-20 mb-6">
          <img src="/login-illustration.svg" alt="login illustration" className="w-48 h-48" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="Email"
                aria-label="email"
                className="w-full border rounded-md py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500">
                {/* envelope icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v16H4z" fill="none" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
            </div>
            {touched.email && errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Password"
                aria-label="password"
                className="w-full border rounded-md py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/^\s+/, ""); // starting spaces remove
                }}
              />

              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500">
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6 0-10-8-10-8a19.19 19.19 0 0 1 5.06-5.94" />
                    <path d="M1 1l22 22" />
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  </svg>
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || isFormInvalid()}
            className={'w-full py-3 rounded-md font-semibold button-gradient'}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
