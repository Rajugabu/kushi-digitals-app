import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import {
  claimReferralCode,
  normalizeReferralCode,
} from "../../services/referrals";

const referralStorageKey = "kushi_pending_referral_code";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    try {
      setIsLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error(
          "Login session was not created. Please verify your email and try again.",
        );
      }

      const pendingReferralCode = normalizeReferralCode(
        window.sessionStorage.getItem(referralStorageKey) || "",
      );

      if (pendingReferralCode) {
        try {
          const claimResult = await claimReferralCode(
            pendingReferralCode,
          );

          if (claimResult?.success) {
            window.sessionStorage.removeItem(
              referralStorageKey,
            );
          }
        } catch (referralError) {
          console.error(
            "Unable to finalize referral attribution:",
            referralError,
          );
        }
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(
          `Unable to load account role: ${profileError.message}`,
        );
      }

      const role = profile?.role || "customer";

      setMessage(
        role === "admin"
          ? "Admin login successful. Opening Admin Dashboard..."
          : "Login successful. Opening Kushi Digitals Dashboard...",
      );

      setMessageType("success");

      window.setTimeout(() => {
        navigate(
          role === "admin" ? "/admin" : "/dashboard",
          { replace: true },
        );
      }, 700);
    } catch (error) {
      let errorMessage =
        error.message ||
        "Unable to login. Please check your email and password.";

      if (
        errorMessage
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        errorMessage =
          "Your email is not confirmed. Please open the confirmation email from Supabase and click Confirm Email.";
      }

      if (
        errorMessage
          .toLowerCase()
          .includes("invalid login credentials")
      ) {
        errorMessage =
          "Email or password is incorrect. Please check both and try again.";
      }

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div className="auth-form-heading">
        <span>Account Login</span>

        <h2>Welcome Back</h2>

        <p>
          Enter your account details to continue to Kushi
          Digitals.
        </p>
      </div>

      {message && (
        <div
          className={`auth-information-message ${
            messageType === "error"
              ? "auth-error-message"
              : "auth-success-message"
          }`}
          role="alert"
        >
          {message}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-input-group">
          <label htmlFor="loginEmail">
            Email Address
          </label>

          <div className="auth-input-wrapper">
            <Mail size={19} />

            <input
              id="loginEmail"
              name="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-input-group">
          <div className="auth-label-row">
            <label htmlFor="loginPassword">
              Password
            </label>

            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <div className="auth-input-wrapper">
            <LockKeyhole size={19} />

            <input
              id="loginPassword"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>
        </div>

        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) =>
              setRememberMe(event.target.checked)
            }
          />

          <span className="auth-checkbox-box" />

          <span>Keep me signed in</span>
        </label>

        <button
          type="submit"
          className="primary-button auth-submit-button"
          disabled={isLoading}
        >
          <LogIn size={19} />

          {isLoading
            ? "Checking Account..."
            : "Login to Dashboard"}

          <ArrowRight size={18} />
        </button>
      </form>

      <div className="auth-divider">
        <span>New to Kushi Digitals?</span>
      </div>

      <Link
        to="/signup"
        className="auth-secondary-action"
      >
        Create New Account
        <ArrowRight size={18} />
      </Link>

      <p className="auth-legal-note">
        By continuing, you agree to our{" "}
        <Link to="/terms">Terms & Conditions</Link> and{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default Login;
