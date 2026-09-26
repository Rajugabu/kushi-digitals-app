import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  ChevronDown,
  CircleUserRound,
  Coins,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../services/supabase";

const dashboardLinks = [
  {
    to: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/dashboard/creations",
    label: "My Creations",
    icon: WandSparkles,
  },
  {
    to: "/dashboard/wallet",
    label: "Credits",
    icon: Coins,
  },
  {
    to: "/dashboard/profile",
    label: "My Profile",
    icon: CircleUserRound,
  },
  {
    to: "/dashboard/support",
    label: "Support",
    icon: MessageCircle,
  },
];

function DashboardLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Unable to load user:", error);
        return;
      }

      setUser(currentUser);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setUser(session?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Customer"
    );
  }, [user]);

  const initials = useMemo(() => {
    const words = displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) {
      return "KD";
    }

    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }, [displayName]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);

      alert(
        error.message ||
          "Unable to logout. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-shell">
      <div
        className={`dashboard-sidebar-backdrop ${
          sidebarOpen ? "visible" : ""
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="dashboard-sidebar-header">
          <Link
            to="/"
            className="brand dashboard-brand"
            onClick={closeSidebar}
          >
            <span className="brand-icon">
              <Camera size={24} />
            </span>

            <span className="brand-copy">
              <span className="brand-name">
                Kushi Digitals
              </span>

              <span className="brand-tagline">
                AI Creator Dashboard
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="dashboard-sidebar-close"
            onClick={closeSidebar}
            aria-label="Close dashboard menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="dashboard-user-card">
          <div className="dashboard-user-avatar">
            {initials}
          </div>

          <div>
            <span>Welcome back</span>
            <strong>{displayName}</strong>

            <small>
              {user?.email || "Loading account..."}
            </small>
          </div>
        </div>

        <nav className="dashboard-navigation">
          <span className="dashboard-navigation-label">
            Creator Menu
          </span>

          {dashboardLinks.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `dashboard-nav-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-footer">
          <Link
            to="/"
            className="dashboard-home-link"
            onClick={closeSidebar}
          >
            <Home size={19} />
            Return to Website
          </Link>

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={19} />

            {isLoggingOut
              ? "Logging Out..."
              : "Logout"}
          </button>
        </div>
      </aside>

      <div className="dashboard-content-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              type="button"
              className="dashboard-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open dashboard menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <span>Kushi Digitals</span>

              <strong>
                AI Creator Dashboard
              </strong>
            </div>
          </div>

          <div className="dashboard-topbar-actions">
            <Link
              to="/ai-photo-studio"
              className="dashboard-book-button"
            >
              <Sparkles size={18} />
              Create with AI
            </Link>

            <div className="dashboard-profile-menu">
              <button
                type="button"
                className="dashboard-profile-button"
                onClick={() =>
                  setProfileMenuOpen(
                    (current) => !current,
                  )
                }
                aria-expanded={profileMenuOpen}
              >
                <span className="dashboard-profile-avatar">
                  {initials}
                </span>

                <span className="dashboard-profile-copy">
                  <strong>{displayName}</strong>
                  <small>Customer</small>
                </span>

                <ChevronDown size={17} />
              </button>

              {profileMenuOpen && (
                <div className="dashboard-profile-dropdown">
                  <div>
                    <CircleUserRound size={19} />

                    <span>
                      <strong>{displayName}</strong>
                      <small>{user?.email}</small>
                    </span>
                  </div>

                  <Link
                    to="/dashboard/creations"
                    onClick={() =>
                      setProfileMenuOpen(false)
                    }
                  >
                    <WandSparkles size={18} />
                    My Creations
                  </Link>

                  <Link
                    to="/dashboard/wallet"
                    onClick={() =>
                      setProfileMenuOpen(false)
                    }
                  >
                    <Coins size={18} />
                    Credits
                  </Link>

                  <Link
                    to="/dashboard/profile"
                    onClick={() =>
                      setProfileMenuOpen(false)
                    }
                  >
                    <CircleUserRound size={18} />
                    Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut size={18} />

                    {isLoggingOut
                      ? "Logging Out..."
                      : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-main-content">
          <Outlet
            context={{
              user,
              displayName,
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
