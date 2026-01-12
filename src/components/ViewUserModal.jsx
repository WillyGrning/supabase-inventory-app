/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserCircleIcon, 
  EnvelopeIcon, 
  ShieldCheckIcon, 
  CalendarIcon, 
  ShoppingCartIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import { getUserDetails } from '../api/users';

export default function ViewUserModal({ user, onClose }) {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserDetails();
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const details = await getUserDetails(user.id);
      setUserDetails(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const calculateProductValue = (products) => {
    return products?.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0) || 0;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading user details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserCircleIcon className="h-5 w-5 mr-2" />
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <div className="flex items-center mt-1">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-mono text-sm text-gray-900 mt-1">{user.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <div className="flex items-center mt-1">
                        <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' : 'Regular User'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Verification Status</p>
                      <div className="flex items-center mt-1">
                        {user.verified ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                            <span className="text-green-700 font-medium">Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                            <span className="text-yellow-700 font-medium">Pending Verification</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Timeline */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Account Timeline
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Account Created</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(user.updated_at)}
                      </span>
                    </div>
                    {userDetails?.stats?.last_login && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Login</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(userDetails.stats.last_login)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inventory Stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Inventory Statistics
                </h3>
                
                {userDetails?.stats ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Products</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {userDetails.stats.total_products}
                          </p>
                        </div>
                        <ShoppingCartIcon className="h-8 w-8 text-purple-400" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Inventory Value</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${userDetails.stats.total_inventory_value.toFixed(2)}
                          </p>
                        </div>
                        <CurrencyDollarIcon className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>

                    {/* Recent Products */}
                    {userDetails.products && userDetails.products.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Recent Products ({userDetails.products.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {userDetails.products.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.sku}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${(product.quantity * product.unit_price).toFixed(2)}</p>
                                <p className="text-sm text-gray-500">{product.quantity} units</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300" />
                    <p className="mt-2">No inventory data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t rounded-b-xl flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}