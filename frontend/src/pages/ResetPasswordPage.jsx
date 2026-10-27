import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Link as LinkIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { supabase } from "../auth/supabase.js";
import { getRecoveryLinkState } from "../services/passwordResetHelpers.js";

export default function ResetPasswordPage() {
  const { user, loading, initializationError, configured, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState("checking");

  const recoveryState = useMemo(() => getRecoveryLinkState(window.location), []);

  useEffect(() => {
    let active = true;

    async function processRecoveryCallback() {
      if (!supabase) {
        if (active) setCallbackStatus("missing-config");
        return;
      }

      try {
        const { hasCode, hasRecoveryHash, hasSessionToken } = recoveryState;
        if (hasCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(recoveryState.code);
          if (!active) return;
          if (error) {
            throw error;
          }
          if (data?.session) {
            setCallbackStatus("ready");
            return;
          }
        }

        if (hasRecoveryHash || hasSessionToken) {
          const { data, error } = await supabase.auth.getSession();
          if (!active) return;
          if (error) {
            throw error;
          }
          if (data?.session) {
            setCallbackStatus("ready");
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          throw error;
        }
        if (data?.session) {
          setCallbackStatus("ready");
          return;
        }
        setCallbackStatus("invalid");
      } catch (reason) {
        if (!active) return;
        setError(reason.message || "The recovery link could not be validated. Please request a new reset link.");
        setCallbackStatus("invalid");
      }
    }

    if (!loading && !updated) {
      processRecoveryCallback();
    }

    return () => {
      active = false;
    };
  }, [loading, recoveryState, updated]);

  const isReadyForUpdate = Boolean(user && callbackStatus === "ready" && !updated);

  if (loading || callbackStatus === "checking") {
    return <main className="auth-loading" role="status">Verifying your password reset link…</main>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!configured || !supabase) {
      setError("Password recovery is not configured for this application.");
      return;
    }
    if (!user || callbackStatus !== "ready") {
      setError("This reset link is invalid or expired. Request a new one from the sign-in page.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) throw updateError;
      const { error: signOutError } = await signOut();
      if (signOutError) {
        setError("Your password was updated, but this session could not be signed out. Sign out before signing back in.");
      }
      setUpdated(true);
      setCallbackStatus("complete");
    } catch (reason) {
      setError(reason.message || "The reset link may have expired. Request a new password reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  async function returnToSignIn(event) {
    if (user && updated) {
      event.preventDefault();
      const { error: signOutError } = await signOut();
      if (signOutError) {
        setError("Password updated, but this session could not be signed out. Please try signing out before you sign in again.");
        return;
      }
      navigate("/login", { replace: true, state: { notice: "Your password has been updated. Sign in with your new password." } });
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <Link to="/login" className="auth-brand"><LinkIcon size={18} /> Ulavurai</Link>
        <div className="auth-heading">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1 id="reset-password-title">Choose a new password</h1>
          <p>Use at least 8 characters for your new password.</p>
        </div>
        {initializationError && (
          <div className="alert alert-error" role="alert">
            The recovery session could not be verified. Request a new reset link and open it in this browser.
          </div>
        )}
        {error && <div className={updated ? "alert alert-warning" : "alert alert-error"} role={updated ? "status" : "alert"}>{error}</div>}
        {updated && (
          <div className="alert auth-success" role="status">
            Your password has been updated. You can now sign in with your new password.
          </div>
        )}
        {!user && !initializationError && callbackStatus === "invalid" && (
          <div className="alert alert-warning" role="alert">
            This reset link is invalid or expired. Request a new one from the sign-in page.
          </div>
        )}
        {!updated && callbackStatus !== "invalid" && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              New password
              <span className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
            </label>
            <label className="field">
              Confirm new password
              <span className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
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
            </label>
            <button
              className="button button-primary button-wide auth-submit"
              type="submit"
              disabled={submitting || !configured || !isReadyForUpdate}
            >
              {submitting ? "Updating password…" : "Update password"}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login" onClick={returnToSignIn}>Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
