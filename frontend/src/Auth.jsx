
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound
} from "lucide-react";
import api from "./api";
import "./Auth.css";

function Auth({ mode = "login" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    location.state?.message || ""
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        const payload = {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role
        };

        if (role === "recruiter") {
          payload.companyName = companyName.trim();
        }

        await api.post("/auth/register", payload);

        navigate("/login", {
          replace: true,
          state: {
            message: "Account created successfully. Please sign in."
          }
        });

        return;
      }

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password
      });

      sessionStorage.setItem(
        "accessToken",
        response.data.accessToken
      );

      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const data = requestError.response?.data;

      const validationMessages = data?.errors
        ?.map((item) => item.message)
        .join(". ");

      setError(
        validationMessages ||
        data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          <span>
            pathway<span className="brand-period">.</span>
          </span>
        </Link>

        <Link to="/" className="auth-home-link">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>

      <main className="auth-main">
        <motion.section
          className="auth-card"
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="auth-icon">
            {isRegister ? (
              <UserRound size={26} />
            ) : (
              <LockKeyhole size={26} />
            )}
          </div>

          <span className="section-eyebrow">
            {isRegister ? "START YOUR JOURNEY" : "WELCOME BACK"}
          </span>

          <h1>
            {isRegister ? "Create your account." : "Good to see you."}
          </h1>

          <p className="auth-description">
            {isRegister
              ? "Join Pathway and discover your next opportunity."
              : "Sign in to continue your career journey."}
          </p>

          {success && (
            <div className="auth-message auth-success" role="status">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="auth-message auth-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label htmlFor="fullName">Full name</label>
                <div className="auth-input-wrap">
                  <UserRound size={18} />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>

                <label htmlFor="role">I want to join as</label>
                <div className="auth-role-options">
                  <button
                    type="button"
                    className={`auth-role-option ${role === "student" ? "selected" : ""}`}
                    aria-pressed={role === "student"}
                    onClick={() => setRole("student")}
                  >
                    <GraduationCap size={20} />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    className={`auth-role-option ${role === "recruiter" ? "selected" : ""}`}
                    aria-pressed={role === "recruiter"}
                    onClick={() => setRole("recruiter")}
                  >
                    <BriefcaseBusiness size={20} />
                    <span>Recruiter</span>
                  </button>
                </div>

                {role === "recruiter" && (
                  <>
                    <label htmlFor="companyName">Company name</label>
                    <div className="auth-input-wrap">
                      <BriefcaseBusiness size={18} />
                      <input
                        id="companyName"
                        type="text"
                        autoComplete="organization"
                        placeholder="Enter your company name"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        maxLength={150}
                        required
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <label htmlFor="email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={255}
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <LockKeyhole size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={isRegister ? 8 : undefined}
                maxLength={isRegister ? 72 : undefined}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              className="button button-purple auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to Pathway?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="auth-legal">
            By continuing, you agree to use Pathway responsibly.
          </p>
        </motion.section>
      </main>

      <footer className="auth-footer">
        <Link to="/contact">Contact</Link>
        <span>Utsadeep Kundu</span>
      </footer>
    </div>
  );
}

export default Auth;
