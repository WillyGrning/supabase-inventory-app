/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import {
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change >= 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change)}% from last period
            </span>
          </div>
        )}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('session');
      
      // Fetch inventory stats
      const statsResponse = await fetch('/api/analytics/inventory-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      
      // Fetch category distribution
      const categoryResponse = await fetch('/api/analytics/category-distribution', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const categoryData = categoryResponse.ok ? await categoryResponse.json() : [];
      
      // Fetch low stock products
      const lowStockResponse = await fetch('/api/products?low_stock=true&limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const lowStockProducts = lowStockResponse.ok ? await lowStockResponse.json() : [];
      
      setStats(statsData);
      setCategoryData(categoryData);
      setLowStockProducts(lowStockProducts);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Fallback to mock data if API fails
      setStats({
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        avgUnitPrice: 0,
      });
      setCategoryData([]);
      setLowStockProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Prepare data for charts
  const categoryChartData = categoryData.map(cat => ({
    name: cat.category_name || 'Uncategorized',
    value: parseFloat(cat.total_value) || 0,
    count: parseInt(cat.item_count) || 0,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Analytics</h1>
          <p className="text-gray-600">Monitor your inventory performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Items"
          value={stats?.totalItems?.toLocaleString() || '0'}
          icon={CubeIcon}
          color="bg-blue-500"
          subtitle="Items in inventory"
        />
        <StatCard
          title="Inventory Value"
          value={`$${parseFloat(stats?.totalValue || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`}
          icon={CurrencyDollarIcon}
          color="bg-green-500"
          subtitle="Total stock value"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockItems || 0}
          icon={ExclamationTriangleIcon}
          color="bg-orange-500"
          subtitle="Below minimum threshold"
        />
        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockItems || 0}
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
          subtitle="Require immediate attention"
        />
      </div>

      {/* Category Distribution */}
      {categoryChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Inventory Value by Category</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `$${parseFloat(value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`,
                    'Value'
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stock Alerts */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Stock Alerts</h2>
        
        {lowStockProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minimum Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockProducts.map((product) => {
                  const isOutOfStock = product.quantity === 0;
                  const isLowStock = product.quantity > 0 && product.quantity <= product.min_stock;
                  
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{product.quantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{product.min_stock || 10}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isOutOfStock 
                            ? 'bg-red-100 text-red-800'
                            : isLowStock
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">
                          ${(product.quantity * (product.unit_price || 0)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          @${(product.unit_price || 0).toFixed(2)}/unit
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
            <p className="mt-2 text-gray-600">No stock alerts at the moment</p>
            <p className="text-sm text-gray-500">All products are adequately stocked</p>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-medium mb-4">Average Unit Price</h3>
          <div className="text-3xl font-bold text-blue-600">
            ${parseFloat(stats?.avgUnitPrice || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
          <p className="text-sm text-gray-500 mt-2">Across all products</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-medium mb-4">Total Categories</h3>
          <div className="text-3xl font-bold text-purple-600">
            {categoryData.length}
          </div>
          <p className="text-sm text-gray-500 mt-2">Product categories</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-medium mb-4">Inventory Accuracy</h3>
          <div className="text-3xl font-bold text-green-600">
            {stats?.inventoryAccuracy || 'N/A'}%
          </div>
          <p className="text-sm text-gray-500 mt-2">Based on last count</p>
        </div>
      </div>
    </div>
  );
}