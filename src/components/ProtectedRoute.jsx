import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      console.log("🔍 ProtectedRoute checking...");
      console.log("Path:", location.pathname);

      // HANYA cek sessionStorage
      const token = sessionStorage.getItem("session");
      console.log("Token in sessionStorage:", token ? "Exists" : "Missing");

      // Jika sudah login tapi akses login page, redirect
      if (token && location.pathname === "/login") {
        console.log("⚠️ Already logged in, redirecting to dashboard");
        navigate("/", { replace: true });
        return;
      }

      // Jika tidak ada token, redirect ke login
      if (!token) {
        console.log("❌ No token found, redirecting to login");
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }

      // Auth valid
      console.log("✅ Auth valid");
      setChecking(false);
    };

    // Small delay
    checkAuth();
  }, [navigate, location.pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
          <p className="text-sm text-gray-400 mt-2">
            {location.pathname === "/auth/callback"
              ? "Processing Google sign in..."
              : "Verifying session..."}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
