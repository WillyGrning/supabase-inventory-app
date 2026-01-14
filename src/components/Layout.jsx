import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ShieldCheckIcon,
  CogIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Pages where we don't want the header/footer
  const noLayoutPages = ["/login", "/register", "/verify-otp", "/auth/callback", "/forgot-password"];
  const shouldShowLayout = !noLayoutPages.includes(location.pathname);

  // Fetch user data on component mount and route change
  useEffect(() => {
    fetchUserData();
  }, [location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const fetchUserData = async () => {
    try {
      if (noLayoutPages.includes(location.pathname)) {
        setLoading(false);
        return;
      }
      // Ambil token dari sessionStorage (hanya token saja)
      const token = sessionStorage.getItem("session");

      if (!token) {
        navigate("/login");
        return;
      }

      // Ambil data user dari API
      const response = await fetch(`${API_URL}/api/auth/me`, {
      // const response = await await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const email = data.user.email;

        setUserData({
          name: email.split("@")[0] || "User",
          email: email,
          role: data.user.role || "user",
          initial: email.charAt(0).toUpperCase(),
          verified: data.user.verified,
        });
      } else if (response.status === 401) {
        // Session expired
        sessionStorage.removeItem("session");
        navigate("/login");
        return;
      } else {
        throw new Error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);

      // Jika error, redirect ke login
      sessionStorage.removeItem("session");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("session");

      // Optional: Call logout API to invalidate session server-side
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout API error:", error);
      // Continue anyway
    } finally {
      // Clear client-side session
      sessionStorage.removeItem("session");

      // Navigate to login
      navigate("/login");
    }
  };

  // Navigation items based on user role
  const getNavItems = () => {
    const baseNavItems = [
      { name: "Dashboard", href: "/", icon: HomeIcon },
      // { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ];

    if (userData?.role === "admin") {
      return [
        ...baseNavItems,
        { name: "Users", href: "/admin/users", icon: UsersIcon },
        { name: "Analytics", href: "/admin/analytics", icon: ChartPieIcon },
        { name: "System", href: "/admin/system", icon: CogIcon },
      ];
    }

    return baseNavItems;
  };

  const userMenuItems = [
    { name: "Profile", href: "/profile", icon: UserCircleIcon },
    { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
    { name: "Notifications", href: "/notifications", icon: BellIcon },
  ];

  // If it's a login/register page, just render children without layout
  if (!shouldShowLayout) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>

              <Link to="/" className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Inventory Pro
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    Manage your stock efficiently
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {item.name}
                  {item.name === "Users" && userData.role === "admin" && (
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      userData.role === "admin"
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-gradient-to-br from-blue-500 to-indigo-500"
                    }`}
                  >
                    <span className="text-white font-medium">
                      {userData.initial}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {userData.name}
                    </p>
                    <div className="flex items-center">
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">
                        {userData.email}
                      </p>
                      {userData.role === "admin" && (
                        <ShieldCheckIcon className="h-3 w-3 ml-1 text-purple-500" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg py-1 border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                              userData.role === "admin"
                                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                                : "bg-gradient-to-br from-blue-500 to-indigo-500"
                            }`}
                          >
                            <span className="text-white font-medium text-sm">
                              {userData.initial}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {userData.name}
                            </p>
                            <div className="flex items-center">
                              <p className="text-xs text-gray-500 truncate max-w-[140px]">
                                {userData.email}
                              </p>
                              {userData.role === "admin" && (
                                <span className="ml-1 text-[10px] font-medium bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <item.icon className="h-5 w-5 mr-3 text-gray-400" />
                          {item.name}
                        </Link>
                      ))}
                      {userData.role === "admin" && (
                        <Link
                          to="/admin/users"
                          className="flex items-center px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 border-t border-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <UsersIcon className="h-5 w-5 mr-3 text-purple-400" />
                          User Management
                        </Link>
                      )}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg ${
                    location.pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3 text-gray-400" />
                  {item.name}
                  {item.name === "Users" && userData.role === "admin" && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb (optional) */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link to="/" className="text-gray-500 hover:text-gray-700">
                  Home
                </Link>
              </li>
              {location.pathname !== "/" && (
                <>
                  <li>
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </li>
                  <li className="text-gray-700 font-medium">
                    {location.pathname === "/admin/users"
                      ? "User Management"
                      : location.pathname === "/admin/analytics"
                      ? "Analytics"
                      : location.pathname === "/admin/system"
                      ? "System"
                      : location.pathname === "/profile"
                      ? "Profile"
                      : location.pathname === "/settings"
                      ? "Settings"
                      : location.pathname === "/notifications"
                      ? "Notifications"
                      : "Dashboard"}
                  </li>
                </>
              )}
            </ol>
          </nav>
          {userData.role === "admin" &&
            location.pathname.startsWith("/admin") && (
              <div className="mt-2 flex items-center">
                <ShieldCheckIcon className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-xs font-medium text-purple-700">
                  Admin Mode
                </span>
              </div>
            )}
        </div>

        {/* Page Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-gray-200 bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Inventory Pro. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Logged in as:{" "}
                <span className="font-medium">{userData.email}</span>
                {userData.role === "admin" && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    Administrator
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
