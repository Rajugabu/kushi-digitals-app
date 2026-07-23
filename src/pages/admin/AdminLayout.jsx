import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  BookOpen,
  Headphones,
  LayoutDashboard,
  Users,
  Share2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "../../services/supabase";

function AdminLayout() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      try {
        setIsChecking(true);
        setError("");

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        if (profile.role !== "admin") {
          navigate("/dashboard", { replace: true });
          return;
        }

        if (isMounted) {
          setAdminUser({
            ...user,
            fullName: profile.full_name || user.user_metadata?.full_name || "Kushi Digitals Admin",
          });
        }
      } catch (accessError) {
        if (isMounted) setError(accessError.message || "Unable to verify admin access.");
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkAdminAccess();
    return () => { isMounted = false; };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (isChecking) {
    return <div className="admin-access-screen"><ShieldCheck size={34} /><h2>Checking Admin Access...</h2><p>Please wait while we verify your Kushi Digitals administrator account.</p></div>;
  }

  if (error) {
    return <div className="admin-access-screen error"><ShieldCheck size={34} /><h2>Admin Access Error</h2><p>{error}</p><button type="button" onClick={() => navigate("/login")}>Return to Login</button></div>;
  }

  if (!adminUser) return null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon"><ShieldCheck size={24} /></div>
          <div><strong>Kushi Digitals</strong><span>Admin Control Panel</span></div>
        </div>

        <div className="admin-profile-card">
          <div className="admin-profile-avatar"><UserRound size={21} /></div>
          <div><span>Administrator</span><strong>{adminUser.fullName}</strong><small>{adminUser.email}</small></div>
        </div>

        <nav className="admin-navigation">
          <span>ADMIN MENU</span>
          <NavLink to="/admin" end className={({ isActive }) => isActive ? "active" : ""}><LayoutDashboard size={19} />Dashboard</NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => isActive ? "active" : ""}><ClipboardList size={19} />Manage Orders</NavLink>
          <NavLink
            to="/admin/blog"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <BookOpen size={19} />
            Manage Blog
          </NavLink>
          <NavLink
            to="/admin/support"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <Headphones size={19} />
            Support Tickets
          </NavLink>

          <NavLink
            to="/admin/customers"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <Users size={19} />
            Customers
          </NavLink>

          <NavLink
            to="/admin/referrals"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <Share2 size={19} />
            Referrals
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/dashboard"><UserRound size={18} />Customer Dashboard</NavLink>
          <button type="button" onClick={handleLogout}><LogOut size={18} />Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><span>KUSHI DIGITALS ADMIN</span><strong>Business Management Dashboard</strong></div>
          <div className="admin-topbar-user">
            <div><span>{adminUser.fullName}</span><small>Administrator</small></div>
            <div className="admin-topbar-avatar">{adminUser.fullName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="admin-content"><Outlet context={{ adminUser }} /></div>
      </main>
    </div>
  );
}

export default AdminLayout;
