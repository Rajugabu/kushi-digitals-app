import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [location.pathname]);

  return (
    <div className="site-shell">
      <div className="ambient-background" aria-hidden="true">
        <span className="ambient-orb ambient-orb-one" />
        <span className="ambient-orb ambient-orb-two" />
        <span className="ambient-grid" />
      </div>

      <Header />

      <main className="site-main">
        <Outlet />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

export default PublicLayout;