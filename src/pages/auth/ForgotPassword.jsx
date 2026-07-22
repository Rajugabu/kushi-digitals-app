import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

function ForgotPassword() {
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    setMessage(
      "Password reset UI is working. Supabase reset email will be connected in the next phase.",
    );
  };

  return (
    <div className="auth-form-wrapper">
      <div className="auth-form-heading">
        <span>Password Recovery</span>

        <h2>Reset Your Password</h2>

        <p>
          Enter the email address connected to your Kushi Digitals
          account. We will send you a secure password reset link.
        </p>
      </div>

      <div className="password-recovery-icon">
        <KeyRound size={31} />
      </div>

      {message && (
        <div className="auth-information-message">
          {message}
        </div>
      )}

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <div className="auth-input-group">
          <label htmlFor="recoveryEmail">
            Registered Email Address
          </label>

          <div className="auth-input-wrapper">
            <Mail size={19} />

            <input
              id="recoveryEmail"
              name="email"
              type="email"
              placeholder="Enter your registered email"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="primary-button auth-submit-button"
        >
          <ShieldCheck size={19} />
          Send Reset Link
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="password-recovery-note">
        <ShieldCheck size={18} />

        <p>
          For your security, the reset link will expire after a limited
          time. Never share your password or reset link with anyone.
        </p>
      </div>

      <div className="auth-divider">
        <span>Remember your password?</span>
      </div>

      <Link
        to="/login"
        className="auth-secondary-action"
      >
        <ArrowLeft size={18} />
        Back to Login
      </Link>
    </div>
  );
}

export default ForgotPassword;