import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("session");

    if (!token) {
      navigate("/login");
      return;
    }

    // Optional: Verify token dengan API
    // Tapi untuk sekarang, cukup cek existence
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return children;
}
