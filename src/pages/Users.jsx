import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { getUsers } from "../api/users";
import ViewUserModal from "../components/ViewUserModal";

export default function Users() {
  // States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, verified, unverified, admin, user
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    totalProducts: 0,
  });

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getUsers();
      setUsers(data);
      calculateStats(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (users) => {
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const verifiedUsers = users.filter(u => u.verified).length;
    const unverifiedUsers = users.filter(u => !u.verified).length;
    const totalProducts = users.reduce((sum, user) => sum + user.product_count, 0);

    setStats({ totalUsers, totalAdmins, verifiedUsers, unverifiedUsers, totalProducts });
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Search filter
      const searchMatch = 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.id.toLowerCase().includes(search.toLowerCase());

      // Status filter
      let statusMatch = true;
      switch (filter) {
        case 'verified':
          statusMatch = user.verified === true;
          break;
        case 'unverified':
          statusMatch = user.verified === false;
          break;
        case 'admin':
          statusMatch = user.role === 'admin';
          break;
        case 'user':
          statusMatch = user.role === 'user';
          break;
        default:
          statusMatch = true;
      }

      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'product_count':
          aValue = a.product_count;
          bValue = b.product_count;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">View and manage all registered users</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg">
          <UserGroupIcon className="h-5 w-5" />
          <span className="font-medium">{stats.totalUsers} Users</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-xl font-bold">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-100">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-xl font-bold">{stats.totalAdmins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-xl font-bold">{stats.verifiedUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-yellow-100">
              <XCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Unverified</p>
              <p className="text-xl font-bold">{stats.unverifiedUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-indigo-100">
              <ShoppingCartIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-xl font-bold">{stats.totalProducts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by email or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
                <option value="admin">Admins Only</option>
                <option value="user">Users Only</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="created_at">Sort by Date</option>
              <option value="email">Sort by Email</option>
              <option value="product_count">Sort by Products</option>
            </select>
            
            <button
              onClick={() => handleSort(sortBy)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? (
                <ArrowUpIcon className="h-5 w-5" />
              ) : (
                <ArrowDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-2 text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.verified 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ShoppingCartIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium">{user.product_count}</span>
                        <span className="text-gray-500 text-sm ml-1">products</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{filteredUsers.length}</span> of{' '}
                <span className="font-medium">{users.length}</span> users
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">
                  Previous
                </button>
                <span className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium">
                  1
                </span>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}