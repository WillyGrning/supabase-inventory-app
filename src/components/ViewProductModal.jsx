import { XMarkIcon, ShoppingCartIcon, TagIcon, CubeIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ViewProductModal({ product, onClose }) {
  const totalValue = product.quantity * product.unit_price;
  
  const getStockStatus = (quantity, minStock) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= minStock) return { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const status = getStockStatus(product.quantity, product.min_stock);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
              <p className="text-gray-600">View product information</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Product Name</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{product.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">SKU</label>
                    <div className="mt-1 flex items-center">
                      <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{product.sku}</code>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-gray-900">{product.categories?.name || 'Uncategorized'}</p>
                  </div>
                </div>
              </div>

              {/* Stock & Price */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Stock & Pricing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Current Stock</label>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{product.quantity} units</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Minimum Stock</label>
                      <p className="mt-1 text-lg text-gray-900">{product.min_stock} units</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Unit Price</label>
                    <div className="mt-1 flex items-center">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-2xl font-bold text-gray-900">
                        ${product.unit_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Total Value</label>
                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      ${totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CubeIcon className="h-6 w-6 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Stock Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Stock Level</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        status.text === 'Out of Stock' ? 'bg-red-500' :
                        status.text === 'Low Stock' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((product.quantity / (product.min_stock * 3)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Description
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Product ID</p>
                <p className="text-sm font-mono text-gray-900 truncate">{product.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(product.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="text-sm font-mono text-gray-900 truncate">{product.user_id}</p>
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