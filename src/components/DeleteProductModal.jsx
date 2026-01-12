import { useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function DeleteProductModal({ product, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('session');
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      onSuccess(product.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const totalValue = product.quantity * product.unit_price;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delete Product</h2>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium">
                Are you sure you want to delete this product?
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-500">Product Name</p>
                <p className="font-medium text-gray-900">{product.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">SKU</p>
                  <p className="font-mono text-gray-900">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className="font-medium text-gray-900">{product.quantity} units</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-lg font-bold text-red-600">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Product'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}