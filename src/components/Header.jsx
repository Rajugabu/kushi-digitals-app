import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Camera,
  Menu,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const navigationItems = [
  { name: "Home", path: "/" },
  { name: "AI Photo Studio", path: "/ai-photo-studio" },
  { name: "Poster Studio", path: "/poster-studio" },
  { name: "Business Studio", path: "/business-studio" },
  { name: "Design Studio", path: "/studio" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const closeTimer = window.setTimeout(() => setMenuOpen(false), 0);

    return () => window.clearTimeout(closeTimer);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="header-glow" aria-hidden="true" />

      <div className="container header-container">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Camera size={25} strokeWidth={2.2} />
          </span>

          <span className="brand-copy">
            <span className="brand-name">Kushi Digitals</span>
            <span className="brand-tagline">AI Creative Studio</span>
          </span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>

        <div className={`navigation-wrapper ${menuOpen ? "menu-open" : ""}`}>
          <nav className="main-navigation" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  (isActive ? "nav-link active" : "nav-link")
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link to="/login" className="login-button">
              <UserRound size={18} />
              <span>Login</span>
            </Link>

            <Link to="/ai-photo-studio" className="header-cta">
              <Sparkles size={17} />
              <span>Start Creating</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
