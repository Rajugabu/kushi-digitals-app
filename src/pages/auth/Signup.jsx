import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { supabase } from "../../services/supabase";
import {
  claimReferralCode,
  normalizeReferralCode,
  validateReferralCode,
} from "../../services/referrals";

const referralStorageKey = "kushi_pending_referral_code";

function Signup() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    const capturedCode = normalizeReferralCode(
      searchParams.get("ref") ||
        window.sessionStorage.getItem(referralStorageKey) ||
        "",
    );

    if (capturedCode) {
      window.sessionStorage.setItem(
        referralStorageKey,
        capturedCode,
      );
    }

    return capturedCode;
  });
  const [referralStatus, setReferralStatus] = useState(null);
  const [isCheckingReferral, setIsCheckingReferral] =
    useState(false);

  const checkReferralCode = async (code = referralCode) => {
    const normalizedCode = normalizeReferralCode(code);

    if (!normalizedCode) {
      setReferralStatus(null);
      return null;
    }

    try {
      setIsCheckingReferral(true);
      const result = await validateReferralCode(normalizedCode);
      setReferralStatus(result);
      return result;
    } catch (validationError) {
      setReferralStatus({
        valid: false,
        message:
          validationError.message ||
          "Referral validation is temporarily unavailable. Signup can still continue.",
      });
      return null;
    } finally {
      setIsCheckingReferral(false);
    }
  };

  const handleSubmit = async (event) => {
  event.preventDefault();

  setMessage("");
  setMessageType("");

  const form = event.currentTarget;
  const formData = new FormData(form);

  const fullName = formData.get("fullName")?.trim();
  const phone = formData.get("phone")?.trim();
  const email = formData.get("email")?.trim();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const normalizedReferralCode =
    normalizeReferralCode(referralCode);

  if (password !== confirmPassword) {
    setMessage("Password and confirm password do not match.");
    setMessageType("error");
    return;
  }

  if (!acceptedTerms) {
    setMessage(
      "Please accept the Terms & Conditions and Privacy Policy.",
    );
    setMessageType("error");
    return;
  }

  try {
    setIsLoading(true);

    const validation = normalizedReferralCode
      ? await checkReferralCode(normalizedReferralCode)
      : null;

    const validInviterCode = validation?.valid
      ? normalizedReferralCode
      : null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          inviter_code: validInviterCode,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      throw error;
    }

    let referralMessage = "";

    if (data.session && validInviterCode) {
      const claimResult = await claimReferralCode(
        validInviterCode,
      );

      if (claimResult?.success) {
        window.sessionStorage.removeItem(
          referralStorageKey,
        );
        referralMessage =
          " Your referral parent was assigned successfully.";
      } else {
        referralMessage = ` ${
          claimResult?.message ||
          "The referral code was not applied."
        }`;
      }
    } else if (validInviterCode) {
      referralMessage =
        " Your referral code will be securely applied during account confirmation.";
    } else if (normalizedReferralCode) {
      referralMessage =
        " The supplied referral code was not valid, so no referral parent was assigned.";
    }

    if (data.session) {
      setMessage(
        `Account created successfully. You are now signed in.${referralMessage}`,
      );
    } else {
      setMessage(
        `Account created successfully. Please check your email and confirm your account before logging in.${referralMessage}`,
      );
    }

    setMessageType("success");
    form.reset();
    setAcceptedTerms(false);
    setReferralStatus(null);
  } catch (error) {
    setMessage(
      error.message ||
        "Unable to create your account. Please try again.",
    );
    setMessageType("error");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="auth-form-wrapper auth-signup-wrapper">
      <div className="auth-form-heading">
        <span>Create Customer Account</span>

        <h2>Join Kushi Digitals</h2>

        <p>
          Create your secure account to manage orders, referral
          earnings, wallet balance and customer support.
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

      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >
        <div className="auth-signup-grid">
          <div className="auth-input-group">
            <label htmlFor="signupName">
              Full Name
            </label>

            <div className="auth-input-wrapper">
              <UserRound size={19} />

              <input
                id="signupName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="signupPhone">
              Phone Number
            </label>

            <div className="auth-input-wrapper">
              <Phone size={19} />

              <input
                id="signupPhone"
                name="phone"
                type="tel"
                placeholder="Enter phone number"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>
          </div>
        </div>

        <div className="auth-input-group">
          <label htmlFor="signupEmail">
            Email Address
          </label>

          <div className="auth-input-wrapper">
            <Mail size={19} />

            <input
              id="signupEmail"
              name="email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-signup-grid">
          <div className="auth-input-group">
            <label htmlFor="signupPassword">
              Password
            </label>

            <div className="auth-input-wrapper">
              <LockKeyhole size={19} />

              <input
                id="signupPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                autoComplete="new-password"
                minLength="6"
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

          <div className="auth-input-group">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="auth-input-wrapper">
              <LockKeyhole size={19} />

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength="6"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current,
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="auth-input-group">
          <label htmlFor="referralCode">
            Referral Code
            <span className="auth-optional-label">
              Optional
            </span>
          </label>

          <div className="auth-input-wrapper">
            <Gift size={19} />

            <input
              id="referralCode"
              name="referralCode"
              type="text"
              placeholder="Enter referral code"
              autoComplete="off"
              value={referralCode}
              onChange={(event) => {
                const value = normalizeReferralCode(
                  event.target.value,
                );
                setReferralCode(value);
                setReferralStatus(null);

                if (value) {
                  window.sessionStorage.setItem(
                    referralStorageKey,
                    value,
                  );
                } else {
                  window.sessionStorage.removeItem(
                    referralStorageKey,
                  );
                }
              }}
              onBlur={() => checkReferralCode()}
            />
          </div>

          <small className="auth-field-help">
            {isCheckingReferral
              ? "Checking referral code..."
              : referralStatus?.message ||
                "Enter the referral code only if someone referred you."}
          </small>
        </div>

        <label className="auth-checkbox auth-terms-checkbox">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) =>
              setAcceptedTerms(event.target.checked)
            }
          />

          <span className="auth-checkbox-box" />

          <span>
            I agree to the{" "}
            <Link to="/terms">
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
  type="submit"
  className="primary-button auth-submit-button"
  disabled={isLoading}
>
  <UserRoundPlus size={19} />

  {isLoading
    ? "Creating Account..."
    : "Create My Account"}

  <ArrowRight size={18} />
</button>
      </form>

      <div className="auth-divider">
        <span>Already have an account?</span>
      </div>

      <Link
        to="/login"
        className="auth-secondary-action"
      >
        Login to Existing Account
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}

export default Signup;
