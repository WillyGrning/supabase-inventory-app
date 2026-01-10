/* eslint-disable no-unused-vars */
import React, { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  LogOut,
  Menu,
  Home,
  Archive,
  Activity,
  Filter,
  ChevronDown,
} from "lucide-react";

// ============================================
// SUPABASE CONFIGURATION & API SERVICE
// ============================================
const SUPABASE_URL = "https://gugupjlrzvsfxgyejqnf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Z3VwamxyenZzZnhneWVqcW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzI0MDMsImV4cCI6MjA4MzQ0ODQwM30.jaEHcmpJAVH181TB3Ui5RGzJdIzPuzC4Rc9zceYW3M0";

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: this.key,
      ...options.headers
    };

    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers
      // mode: 'cors',
      // credentials: 'include'
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  // Auth
  async signUp(email, password) {
    return this.request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signIn(email, password) {
    const data = await this.request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.token = data.access_token;
    return data;
  }

  async signOut() {
    await this.request('/auth/v1/logout', { method: 'POST' });
    this.token = null;
  }

  async getUser() {
    return this.request('/auth/v1/user', { method: 'GET' });
  }

  // Database
  async query(table, options = {}) {
    let endpoint = `/rest/v1/${table}`;
    const params = new URLSearchParams();

    if (options.select) params.append('select', options.select);
    if (options.eq) {
      Object.entries(options.eq).forEach(([k, v]) => params.append(k, `eq.${v}`));
    }
    if (options.ilike) {
      Object.entries(options.ilike).forEach(([k, v]) => params.append(k, `ilike.${v}`));
    }
    if (options.order) params.append('order', options.order);
    if (options.limit) params.append('limit', options.limit);

    const queryString = params.toString();
    if (queryString) endpoint += `?${queryString}`;

    return this.request(endpoint, { method: 'GET' });
  }

  async insert(table, data) {
    return this.request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(data)
    });
  }

  async update(table, id, data) {
    return this.request(`/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(data)
    });
  }

  async delete(table, id) {
    return this.request(`/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE' });
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      supabase.setToken(token);
      supabase.getUser()
        .then((u) => setUser(u))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    } else setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    const data = await supabase.signIn(email, password);
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signUp = async (email, password) => {
    const data = await supabase.signUp(email, password);
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    await supabase.signOut();
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ============================================
// API SERVICE
// ============================================
const api = {
  // Categories
  getCategories: () => supabase.query("categories", { select: "*" }),

  // Products
  getProducts: (filters = {}) => {
    const options = { select: "*" };
    if (filters.search) options.ilike = { name: `%${filters.search}%` };
    if (filters.category_id) options.eq = { category_id: filters.category_id };
    return supabase.query("products", options);
  },

  createProduct: (product) => supabase.insert("products", product),
  updateProduct: (id, updates) => supabase.update("products", id, updates),
  deleteProduct: (id) => supabase.delete("products", id),

  // Transactions
  getTransactions: (productId = null) => {
    const options = { select: "*", order: "created_at.desc" };
    if (productId) options.eq = { product_id: productId };
    return supabase.query("stock_transactions", options);
  },

  createTransaction: (transaction) =>
    supabase.insert("stock_transactions", transaction),
};

// ============================================
// UTILITY COMPONENTS
// ============================================
const Button = ({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  className = "",
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    ghost: "hover:bg-gray-100 text-gray-700",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </motion.button>
  );
};

const Input = ({ label, error, icon: Icon, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">{label}</label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon size={18} />
        </div>
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 ${
          Icon ? "pl-10" : ""
        } border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
          props.className || ""
        }`}
      />
    </div>
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

const Select = ({ label, error, options, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">{label}</label>
    )}
    <select
      {...props}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

const Card = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const Modal = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
};

const EmptyState = ({ icon: title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Icon size={32} className="text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
    ))}
  </div>
);

// ============================================
// AUTH PAGES
// ============================================
const LoginPage = ({ onSwitchToRegister }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@inventory.app");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Manager
          </h1>
          <p className="text-gray-500 mt-2">Sign in to manage your inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:underline font-medium"
          >
            Register
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const RegisterPage = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Start managing your inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline font-medium"
          >
            Sign In
          </button>
        </p>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN PAGES
// ============================================
const DashboardPage = () => {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, transactionsData, categoriesData] =
        await Promise.all([
          api.getProducts(),
          api.getTransactions(),
          api.getCategories(),
        ]);
      setProducts(productsData);
      setTransactions(transactionsData.slice(0, 5));
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: products.length,
    inStock: products.filter((p) => p.quantity > p.min_stock).length,
    lowStock: products.filter(
      (p) => p.quantity <= p.min_stock && p.quantity > 0
    ).length,
    outOfStock: products.filter((p) => p.quantity === 0).length,
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your inventory status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Stock</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.inStock}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.lowStock}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={24} className="text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.outOfStock}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={24} className="text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {stats.lowStock > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You have {stats.lowStock} product
                {stats.lowStock !== 1 ? "s" : ""} running low on stock. Consider
                restocking soon.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <Activity size={20} className="text-gray-400" />
        </div>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const product = products.find((p) => p.id === t.product_id);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {t.type === "in" ? (
                      <TrendingUp size={18} className="text-green-600" />
                    ) : (
                      <TrendingDown size={18} className="text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {product?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">{t.notes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        t.type === "in" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "in" ? "+" : "-"}
                      {t.quantity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (product) => {
    if (product.quantity === 0)
      return { label: "Out of Stock", variant: "danger" };
    if (product.quantity <= product.min_stock)
      return { label: "Low Stock", variant: "warning" };
    return { label: "In Stock", variant: "success" };
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete product");
      console.error("Failed to delete product:", err);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const closeModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">{products.length} total products</p>
        </div>
        <Button icon={Plus} onClick={() => setShowProductModal(true)}>
          Add Product
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: "", label: "All Categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              searchTerm || selectedCategory
                ? "Try adjusting your filters"
                : "Add your first product to get started"
            }
            action={
              !searchTerm &&
              !selectedCategory && (
                <Button icon={Plus} onClick={() => setShowProductModal(true)}>
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    SKU
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Quantity
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Price
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const category = categories.find(
                    (c) => c.id === product.category_id
                  );
                  const status = getStockStatus(product);
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">
                          {product.name}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </td>
                      <td className="py-4 px-4">
                        {category && (
                          <span
                            className="inline-block px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-900">
                          {product.quantity}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-900">
                          ${product.unit_price.toFixed(2)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProductModal
        isOpen={showProductModal}
        onClose={closeModal}
        product={editingProduct}
        categories={categories}
        onSave={(product) => {
          if (editingProduct) {
            setProducts(
              products.map((p) => (p.id === product.id ? product : p))
            );
          } else {
            setProducts([...products, product]);
          }
          closeModal();
        }}
      />
    </div>
  );
};

const ProductModal = ({ isOpen, onClose, product, categories, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    quantity: 0,
    min_stock: 10,
    unit_price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: "",
        sku: "",
        category_id: categories[0]?.id || "",
        quantity: 0,
        min_stock: 10,
        unit_price: 0,
      });
    }
  }, [product, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (product) {
        const updated = await api.updateProduct(product.id, formData);
        onSave(updated);
      } else {
        const created = await api.createProduct(formData);
        onSave(created);
      }
    } catch (err) {
      setError(err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Product Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="SKU"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          required
        />
        <Select
          label="Category"
          value={formData.category_id}
          onChange={(e) =>
            setFormData({ ...formData, category_id: e.target.value })
          }
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantity: parseInt(e.target.value) || 0,
              })
            }
            required
            min="0"
          />
          <Input
            label="Min Stock"
            type="number"
            value={formData.min_stock}
            onChange={(e) =>
              setFormData({
                ...formData,
                min_stock: parseInt(e.target.value) || 0,
              })
            }
            required
            min="0"
          />
        </div>
        <Input
          label="Unit Price"
          type="number"
          step="0.01"
          value={formData.unit_price}
          onChange={(e) =>
            setFormData({
              ...formData,
              unit_price: parseFloat(e.target.value) || 0,
            })
          }
          required
          min="0"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const TransactionsPage = () => {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, transactionsData, categoriesData] =
        await Promise.all([
          api.getProducts(),
          api.getTransactions(),
          api.getCategories(),
        ]);
      setProducts(productsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Stock Transactions
          </h1>
          <p className="text-gray-500 mt-1">Track all stock movements</p>
        </div>
        <Button icon={Plus} onClick={() => setShowTransactionModal(true)}>
          New Transaction
        </Button>
      </div>

      <Card>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No transactions yet"
            description="Record your first stock movement to get started"
            action={
              <Button icon={Plus} onClick={() => setShowTransactionModal(true)}>
                New Transaction
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const product = products.find((p) => p.id === t.product_id);
              const category = categories.find(
                (c) => c.id === product?.category_id
              );
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        t.type === "in" ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      {t.type === "in" ? (
                        <TrendingUp size={24} className="text-green-600" />
                      ) : (
                        <TrendingDown size={24} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {product?.name || "Unknown Product"}
                      </p>
                      <p className="text-sm text-gray-500">{t.notes}</p>
                      {category && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        t.type === "in" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "in" ? "+" : "-"}
                      {t.quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        products={products}
        onSave={(transaction) => {
          setTransactions([transaction, ...transactions]);
          loadData();
          setShowTransactionModal(false);
        }}
      />
    </div>
  );
};

const TransactionModal = ({ isOpen, onClose, products, onSave }) => {
  const [formData, setFormData] = useState({
    product_id: "",
    type: "in",
    quantity: 1,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (products.length > 0 && !formData.product_id) {
      setFormData((prev) => ({ ...prev, product_id: products[0].id }));
    }
  }, [products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const transaction = await api.createTransaction(formData);
      onSave(transaction);
      setFormData({
        product_id: products[0]?.id || "",
        type: "in",
        quantity: 1,
        notes: "",
      });
    } catch (err) {
      setError(err.message || "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Stock Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Product"
          value={formData.product_id}
          onChange={(e) =>
            setFormData({ ...formData, product_id: e.target.value })
          }
          options={products.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.sku})`,
          }))}
        />
        <Select
          label="Transaction Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          options={[
            { value: "in", label: "Stock In (Add)" },
            { value: "out", label: "Stock Out (Remove)" },
          ]}
        />
        <Input
          label="Quantity"
          type="number"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({
              ...formData,
              quantity: parseInt(e.target.value) || 0,
            })
          }
          required
          min="1"
        />
        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Optional notes about this transaction"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Processing..." : "Save Transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// LAYOUT & APP
// ============================================
// eslint-disable-next-line no-unused-vars
const Layout = ({ children }) => {
  const { user, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "products", label: "Products", icon: Package },
    { id: "transactions", label: "Transactions", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Inventory Manager
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              <Button variant="ghost" icon={LogOut} onClick={signOut} size="sm">
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside
            className={`lg:w-64 ${
              showMobileMenu ? "block" : "hidden lg:block"
            }`}
          >
            <Card>
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentPage === "dashboard" && <DashboardPage />}
                {currentPage === "products" && <ProductsPage />}
                {currentPage === "transactions" && <TransactionsPage />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginPage onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return <Layout />;
};

export default function InventoryApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
