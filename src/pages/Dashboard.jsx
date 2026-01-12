import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { getProducts } from "../api/products";
import AddProductModal from "../components/AddProductModal";
import ViewProductModal from "../components/ViewProductModal";
import EditProductModal from "../components/EditProductModal";
import DeleteProductModal from "../components/DeleteProductModal";

export default function Dashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProducts();
      setProducts(data);
      calculateStats(data);
    } catch (err) {
      setError(err.message || "Failed to load products");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (products) => {
    const totalProducts = products.length;
    const totalValue = products.reduce(
      (sum, product) => sum + product.quantity * product.unit_price,
      0
    );
    const lowStock = products.filter(
      (p) => p.quantity <= p.min_stock && p.quantity > 0
    ).length;
    const outOfStock = products.filter((p) => p.quantity === 0).length;

    setStats({ totalProducts, totalValue, lowStock, outOfStock });
  };

  const filteredProducts = products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase()) ||
        product.categories?.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case "price":
          aValue = a.unit_price;
          bValue = b.unit_price;
          break;
        case "value":
          aValue = a.quantity * a.unit_price;
          bValue = b.quantity * b.unit_price;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getStockStatus = (quantity, minStock) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity <= minStock) return "low-stock";
    return "in-stock";
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteProduct = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleProductAdded = (newProduct) => {
    setProducts((prev) => [newProduct, ...prev]);
    calculateStats([newProduct, ...products]);
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    calculateStats(
      products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setShowEditModal(false);
    setSelectedProduct(null);
  };

  const handleProductDeleted = (deletedProductId) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedProductId));
    calculateStats(products.filter((p) => p.id !== deletedProductId));
    setShowDeleteModal(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Dashboard
          </h1>
          <p className="text-gray-600">Manage your products and stock levels</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Products
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                $
                {stats.totalValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <EyeIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.lowStock}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <ChartBarIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.outOfStock}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="price">Sort by Price</option>
              <option value="value">Sort by Value</option>
            </select>
            <button
              onClick={() => handleSort(sortBy)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === "asc" ? (
                <ArrowUpIcon className="h-5 w-5" />
              ) : (
                <ArrowDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Stock
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total Value
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <ShoppingCartIcon className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-2 text-lg font-medium">
                        No products found
                      </p>
                      <p className="text-sm">
                        Add your first product to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getStockStatus(
                    product.quantity,
                    product.min_stock
                  );
                  const totalValue = product.quantity * product.unit_price;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {product.categories?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                            <div
                              className={`h-2 rounded-full ${
                                status === "out-of-stock"
                                  ? "bg-red-500"
                                  : status === "low-stock"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  (product.quantity / (product.min_stock * 2)) *
                                    100,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                          <span
                            className={`font-medium ${
                              status === "out-of-stock"
                                ? "text-red-600"
                                : status === "low-stock"
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {product.quantity}
                          </span>
                          <span className="text-gray-400 text-sm ml-1">
                            / {product.min_stock} min
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium">
                          ${product.unit_price?.toFixed(2) || "0.00"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">
                          ${totalValue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === "out-of-stock"
                              ? "bg-red-100 text-red-800"
                              : status === "low-stock"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {status === "out-of-stock"
                            ? "Out of Stock"
                            : status === "low-stock"
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="p-1 text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1 text-green-600 hover:text-green-900 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1 text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{filteredProducts.length}</span>{" "}
                of <span className="font-medium">{products.length}</span>{" "}
                products
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">
                  Previous
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
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
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading products
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
            <PlusIcon className="h-6 w-6 mx-auto text-gray-600" />
            <p className="mt-2 text-sm font-medium">Add Product</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
            <ShoppingCartIcon className="h-6 w-6 mx-auto text-gray-600" />
            <p className="mt-2 text-sm font-medium">Restock</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
            <ChartBarIcon className="h-6 w-6 mx-auto text-gray-600" />
            <p className="mt-2 text-sm font-medium">Generate Report</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
            <FunnelIcon className="h-6 w-6 mx-auto text-gray-600" />
            <p className="mt-2 text-sm font-medium">Filter by Category</p>
          </button>
        </div>
      </div>

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleProductAdded}
      />

      {showViewModal && selectedProduct && (
        <ViewProductModal
          product={selectedProduct}
          onClose={() => {
            setShowViewModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showEditModal && selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleProductUpdated}
        />
      )}

      {showDeleteModal && selectedProduct && (
        <DeleteProductModal
          product={selectedProduct}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleProductDeleted}
        />
      )}
    </div>
  );
}
