import { useEffect, useState } from "react";
import { Eye, EyeOff, Leaf, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function AuthPage({ signUp = false }) {
  const {
    user,
    loading,
    initializationError,
    configured,
    signIn,
    signUp: register,
    resetPassword,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
    setError("");
    setNotice(location.state?.notice || "");
    setResetMode(false);
  }, [signUp, location.state?.notice]);

  if (loading) return <main className="auth-loading" role="status">Checking your secure session…</main>;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (resetMode) {
      if (!configured) {
        setError("Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your frontend environment.");
        return;
      }
      const normalizedEmail = email.trim();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError("Enter a valid email address to receive a password reset link.");
        return;
      }
      setSubmitting(true);
      try {
        const { error: resetError } = await resetPassword(normalizedEmail);
        if (resetError) throw resetError;
        setNotice("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
      } catch (reason) {
        const message = reason.message || "Unable to send a password reset email. Please try again.";
        if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests")) {
          setError("Too many reset requests have been sent recently. Please wait a few minutes before requesting another email.");
          return;
        }
        setError(message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!configured) {
      setError("Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your frontend environment.");
      return;
    }
    if (initializationError) {
      setError(`Unable to initialize authentication: ${initializationError}`);
      return;
    }
    if (signUp && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: authError } = signUp
        ? await register(email.trim(), password)
        : await signIn(email.trim(), password);
      if (authError) throw authError;

      if (signUp && !data.session) {
        setNotice("Account created. Check your email for a verification link before signing in.");
      } else if (!signUp) {
        navigate(location.state?.from?.pathname || "/", { replace: true });
      }
    } catch (reason) {
      const message = reason.message?.toLowerCase() || "";
      setError(!signUp && (message.includes("invalid login credentials") || message.includes("invalid_credentials"))
        ? "Email or password is incorrect. Check your details, create an account if you have not registered, or reset your password."
        : reason.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="auth-brand">
          <span className="brand-mark"><Leaf size={21} /></span>
          <span>Ulavurai</span>
        </Link>
        <div className="auth-heading">
          <span className="auth-icon"><ShieldCheck size={20} /></span>
          <p className="eyebrow">YOUR SECURE CROP ADVISORY</p>
          <h1 id="auth-title">{resetMode ? "Reset your password" : signUp ? "Create your account" : "Welcome back"}</h1>
          <p>{resetMode ? "We’ll email you a secure link to choose a new password." : signUp ? "Sign up to access your personalized Ulavurai dashboard." : "Sign in to continue to your Ulavurai dashboard."}</p>
        </div>

        {initializationError && <div className="alert alert-error" role="alert">Unable to restore your session: {initializationError}</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert auth-success" role="status">{notice}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={resetMode && submitting}
            />
          </label>
          {!resetMode && <label className="field">
            Password
            <span className="auth-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={signUp ? "new-password" : "current-password"}
                minLength={signUp ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={signUp ? "At least 8 characters" : "Enter your password"}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>}
          {signUp && !resetMode && (
            <label className="field">
              Confirm password
              <input
                type={showPassword ? "text" : "password"}
                name="password-confirmation"
                autoComplete="new-password"
                minLength={8}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </label>
          )}
          <button className="button button-primary button-wide auth-submit" type="submit" disabled={submitting || !configured}>
            {submitting && <LoaderCircle className="spin" size={17} />}
            {submitting ? "Please wait…" : resetMode ? "Send reset link" : signUp ? "Create account" : "Sign in"}
          </button>
        </form>

        {!signUp && (
          <p className="auth-switch">
            <button type="button" className="auth-link-button" onClick={() => {
              setResetMode(!resetMode);
              setError("");
              setNotice("");
            }}>
              {resetMode ? "Back to sign in" : "Forgot your password?"}
            </button>
          </p>
        )}
        {!configured && <p className="auth-config-note">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local to enable sign-in.</p>}
        {!resetMode && <p className="auth-switch">
          {signUp ? "Already have an account?" : "New to Ulavurai?"}{" "}
          <Link to={signUp ? "/login" : "/signup"}>{signUp ? "Sign in" : "Create an account"}</Link>
        </p>}
        <p className="auth-security-note"><ShieldCheck size={15} /> Your account is secured by Supabase Authentication.</p>
      </section>
    </main>
  );
}
