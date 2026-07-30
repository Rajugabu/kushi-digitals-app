import { Link, Outlet } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function AuthLayout() {
  return (
    <div className="auth-page-shell">
      <div className="auth-background" aria-hidden="true">
        <span className="auth-orb auth-orb-one" />
        <span className="auth-orb auth-orb-two" />
        <span className="auth-grid-pattern" />
      </div>

      <header className="auth-header">
        <Link to="/" className="brand auth-brand">
          <span className="brand-icon">
            <Camera size={25} />
          </span>

          <span className="brand-copy">
            <span className="brand-name">Kushi Digitals</span>

            <span className="brand-tagline">
              Premium Service Studio
            </span>
          </span>
        </Link>

        <Link to="/" className="auth-back-link">
          <ArrowLeft size={18} />
          Back to Website
        </Link>
      </header>

      <main className="auth-main">
        <section className="auth-showcase">
          <div className="auth-showcase-content">
            <div className="eyebrow">
              <Sparkles size={16} />
              <span>Premium Customer Experience</span>
            </div>

            <h1>
              Your Memories.
              <span className="gradient-text">
                {" "}
                Your Orders.
              </span>
              <br />
              One Secure Account.
            </h1>

            <p>
              Login to manage service orders, uploaded photos,
              referral earnings, wallet balance and support requests
              from one clean dashboard.
            </p>

            <div className="auth-benefit-list">
              <div>
                <CheckCircle2 size={19} />

                <span>
                  Track current and completed orders
                </span>
              </div>

              <div>
                <CheckCircle2 size={19} />

                <span>
                  Access your referral and earnings dashboard
                </span>
              </div>

              <div>
                <CheckCircle2 size={19} />

                <span>
                  Securely manage your profile and uploaded photos
                </span>
              </div>
            </div>

            <div className="auth-security-card">
              <ShieldCheck size={25} />

              <div>
                <strong>Secure Customer Access</strong>

                <span>
                  Your account and personal information will be
                  protected using secure authentication.
                </span>
              </div>
            </div>
          </div>

          <div className="auth-showcase-visual">
            <div className="auth-dashboard-card">
              <div className="auth-dashboard-header">
                <div>
                  <span>Customer Dashboard</span>
                  <strong>Welcome Back</strong>
                </div>

                <span className="auth-online-status">
                  <i />
                  Secure
                </span>
              </div>

              <div className="auth-dashboard-main-card">
                <span>Active Orders</span>
                <strong>03</strong>
                <small>Track every order in real time</small>
              </div>

              <div className="auth-dashboard-mini-grid">
                <div>
                  <span>Referral Earnings</span>
                  <strong>₹0</strong>
                </div>

                <div>
                  <span>Wallet Balance</span>
                  <strong>₹0</strong>
                </div>
              </div>

              <div className="auth-dashboard-progress">
                <div>
                  <span>Order Progress</span>
                  <strong>75%</strong>
                </div>

                <div className="auth-progress-track">
                  <span />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;
