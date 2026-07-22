import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { supabase } from "../services/supabase";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Unable to read Supabase session:", error);
      }

      setSession(currentSession);
      setIsChecking(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        if (!isMounted) {
          return;
        }

        setSession(updatedSession);
        setIsChecking(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isChecking) {
    return (
      <div className="protected-route-loader">
        <LoaderCircle size={35} className="spin-icon" />

        <strong>Opening your dashboard...</strong>

        <span>Please wait while we verify your account.</span>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;