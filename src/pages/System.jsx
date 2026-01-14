import { useState, useEffect } from "react";
import {
  DocumentArrowDownIcon,
  CloudArrowDownIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function System() {
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportStatus, setExportStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [systemInfo, setSystemInfo] = useState(null);

  const fetchSystemInfo = async () => {
    try {
      const token = sessionStorage.getItem("session");
      const response = await fetch("/api/system/info", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      } else {
        const errorData = await response.json();
        console.error("System info error:", errorData);
        // Set default info
        setSystemInfo({
          totalProducts: 0,
          lowStockItems: 0,
          totalUsers: 1,
          lastBackup: null,
          version: "1.0.0",
          dbSize: "N/A",
        });
      }
    } catch (error) {
      console.error("Error fetching system info:", error);
      setSystemInfo({
        totalProducts: 0,
        lowStockItems: 0,
        totalUsers: 1,
        lastBackup: null,
        version: "1.0.0",
        dbSize: "N/A",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  // 1. Export Data
  const handleExportData = async () => {
    setLoading(true);
    setExportStatus("Exporting...");

    try {
      const token = sessionStorage.getItem("session");
      const response = await fetch(
        `/api/system/export?format=${exportFormat}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory-export-${
          new Date().toISOString().split("T")[0]
        }.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setExportStatus("✅ Export successful!");
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("❌ Export failed");
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(""), 3000);
    }
  };

  // 2. Backup Data
  const handleBackup = async () => {
    setLoading(true);
    setBackupStatus("Creating backup...");

    try {
      const token = sessionStorage.getItem("session");
      const response = await fetch("/api/system/backup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackupStatus(`✅ Backup created: ${data.filename}`);
        fetchSystemInfo(); // Refresh info
      } else {
        throw new Error("Backup failed");
      }
    } catch (error) {
      console.error("Backup error:", error);
      setBackupStatus("❌ Backup failed");
    } finally {
      setLoading(false);
      setTimeout(() => setBackupStatus(""), 5000);
    }
  };

  // 3. Clear Cache
  const handleClearCache = async () => {
    if (
      !window.confirm(
        "Clear all cached data? This will not delete your actual inventory."
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("session");
      const response = await fetch("/api/system/clear-cache", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert("✅ Cache cleared successfully");
        // Refresh page
        window.location.reload();
      }
    } catch (error) {
      console.error("Clear cache error:", error);
      alert("❌ Failed to clear cache");
    } finally {
      setLoading(false);
    }
  };

  // 4. Check Low Stock (Alert)
  const handleCheckLowStock = async () => {
    setLoading(true);

    try {
      const token = sessionStorage.getItem("session");
      const response = await fetch("/api/products/low-stock?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const lowStockItems = await response.json();

        if (lowStockItems.length > 0) {
          alert(
            `⚠️ Found ${lowStockItems.length} low/out of stock items.\n\nCheck the Inventory page for details.`
          );
        } else {
          alert("✅ All items are adequately stocked!");
        }
      }
    } catch (error) {
      console.error("Check low stock error:", error);
      alert("❌ Failed to check stock");
    } finally {
      setLoading(false);
    }
  };

  // 5. Export PDF (Combined function)
  const handleExportPDF = async (type = "simple") => {
    setLoading(true);
    setExportStatus(
      type === "detailed"
        ? "Generating detailed report..."
        : "Generating PDF..."
    );

    try {
      const token = sessionStorage.getItem("session");

      // Fetch data
      const [productsRes, statsRes] = await Promise.all([
        fetch("/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/analytics/inventory-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false })), // Fallback jika analytics error
      ]);

      if (!productsRes.ok) throw new Error("Failed to fetch products");
      const result = await productsRes.json();

      const products = result.data || result.products || [];
      // eslint-disable-next-line no-unused-vars
      const stats = statsRes.ok ? await statsRes.json() : null;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      if (type === "detailed") {
        // ========== DETAILED PDF ==========
        // Cover Page
        doc.setFontSize(24);
        doc.setTextColor(59, 130, 246);
        doc.text("INVENTORY MANAGEMENT", pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 10;

        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text("COMPREHENSIVE REPORT", pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 20;

        doc.setFontSize(14);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generated: ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          yPos,
          { align: "center" }
        );
        yPos += 10;

        const userEmail =
          localStorage.getItem("user_email") ||
          sessionStorage.getItem("user_email") ||
          "Admin";
        doc.text(`User: ${userEmail}`, pageWidth / 2, yPos, {
          align: "center",
        });

        // Add new page for summary
        doc.addPage();
        yPos = 20;

        // Executive Summary
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Executive Summary", 14, yPos);
        yPos += 15;

        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);

        const totalValue = products.reduce(
          (sum, p) => sum + p.quantity * (p.unit_price || 0),
          0
        );
        const lowStock = products.filter(
          (p) => p.quantity <= (p.min_stock || 10)
        ).length;
        const outOfStock = products.filter((p) => p.quantity === 0).length;
        const avgPrice =
          products.length > 0
            ? products.reduce((sum, p) => sum + (p.unit_price || 0), 0) /
              products.length
            : 0;

        const summaryData = [
          ["Total Products", products.length],
          [
            "Total Inventory Value",
            `$${totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`,
          ],
          ["Low Stock Items", lowStock],
          ["Out of Stock Items", outOfStock],
          ["Average Unit Price", `$${avgPrice.toFixed(2)}`],
        ];

        summaryData.forEach(([label, value], index) => {
          doc.text(`${label}:`, 20, yPos + index * 8);
          doc.text(`${value}`, 80, yPos + index * 8);
        });

        yPos += 60;

        // Low Stock Alert Section
        const lowStockProducts = products
          .filter((p) => p.quantity <= (p.min_stock || 10) || p.quantity === 0)
          .slice(0, 15);

        if (lowStockProducts.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(220, 38, 38);
          doc.text("STOCK ALERTS", 14, yPos);
          yPos += 10;

          doc.setFontSize(10);
          lowStockProducts.forEach((product) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }

            const status =
              product.quantity === 0 ? "OUT OF STOCK" : "LOW STOCK";
            const color =
              product.quantity === 0 ? [220, 38, 38] : [245, 158, 11];

            doc.setTextColor(...color);
            doc.text(`${product.name.substring(0, 40)}...`, 20, yPos);
            doc.text(`SKU: ${product.sku}`, 140, yPos);
            doc.text(
              `Qty: ${product.quantity} / Min: ${product.min_stock || 10}`,
              180,
              yPos
            );
            doc.text(status, 230, yPos);

            yPos += 6;
          });

          yPos += 10;
        }

        // Product List
        doc.addPage();
        yPos = 20;

        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Product Inventory", 14, yPos);
        yPos += 10;

        // Table headers
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        const headers = ["Product", "SKU", "Qty", "Price", "Value", "Status"];
        const headerPositions = [14, 80, 120, 140, 170, 200];

        headers.forEach((header, i) => {
          doc.text(header, headerPositions[i], yPos);
        });

        yPos += 5;
        doc.line(14, yPos, pageWidth - 14, yPos);
        yPos += 5;

        // Product rows
        products.forEach((product) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          const status =
            product.quantity === 0
              ? "OUT"
              : product.quantity <= (product.min_stock || 10)
              ? "LOW"
              : "OK";
          const statusColor =
            status === "OUT"
              ? [220, 38, 38]
              : status === "LOW"
              ? [245, 158, 11]
              : [34, 197, 94];

          doc.setTextColor(30, 41, 59);
          doc.text(
            product.name.substring(0, 35) +
              (product.name.length > 35 ? "..." : ""),
            14,
            yPos
          );
          doc.text(product.sku, 80, yPos);
          doc.text(product.quantity.toString(), 120, yPos);
          doc.text(`$${(product.unit_price || 0).toFixed(2)}`, 140, yPos);
          doc.text(
            `$${(product.quantity * (product.unit_price || 0)).toFixed(2)}`,
            170,
            yPos
          );

          doc.setTextColor(...statusColor);
          doc.text(status, 200, yPos);

          yPos += 7;
        });

        // Recommendations Page
        doc.addPage();
        yPos = 20;

        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Recommendations", 14, yPos);
        yPos += 15;

        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);

        const recommendations = [
          "1. Reorder out-of-stock items immediately",
          "2. Review low-stock items for potential reorder",
          "3. Consider adjusting minimum stock levels",
          "4. Analyze slow-moving inventory",
          "5. Verify pricing accuracy",
          "6. Update product descriptions and categories",
          "7. Schedule regular inventory audits",
          "8. Consider inventory optimization strategies",
        ];

        recommendations.forEach((rec, index) => {
          doc.text(rec, 20, yPos + index * 8);
        });
      } else {
        // ========== SIMPLE PDF ==========
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Inventory Report", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Generated: ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          yPos,
          { align: "center" }
        );
        yPos += 10;

        // Summary Stats
        const totalValue = products.reduce(
          (sum, p) => sum + p.quantity * (p.unit_price || 0),
          0
        );
        const lowStock = products.filter(
          (p) => p.quantity <= (p.min_stock || 10)
        ).length;
        const outOfStock = products.filter((p) => p.quantity === 0).length;

        doc.setFontSize(11);
        doc.text(`Total Items: ${products.length}`, 14, yPos);
        yPos += 7;
        doc.text(
          `Total Value: $${totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`,
          14,
          yPos
        );
        yPos += 7;
        doc.text(`Low Stock: ${lowStock} items`, 14, yPos);
        yPos += 7;
        doc.text(`Out of Stock: ${outOfStock} items`, 14, yPos);
        yPos += 15;

        // Table data
        const tableData = products.map((p) => [
          p.name.substring(0, 30) + (p.name.length > 30 ? "..." : ""),
          p.sku,
          p.quantity,
          p.min_stock || 10,
          `$${(p.unit_price || 0).toFixed(2)}`,
          `$${(p.quantity * (p.unit_price || 0)).toFixed(2)}`,
          p.quantity === 0
            ? "OUT"
            : p.quantity <= (p.min_stock || 10)
            ? "LOW"
            : "OK",
        ]);

        // AutoTable
        doc.autoTable({
          startY: yPos,
          head: [
            [
              "Product Name",
              "SKU",
              "Qty",
              "Min",
              "Unit Price",
              "Value",
              "Status",
            ],
          ],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 25 },
          },
          margin: { left: 14, right: 14 },
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY || 100;
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Inventory Management System", pageWidth / 2, finalY + 10, {
          align: "center",
        });
      }

      // Save PDF
      const filename =
        type === "detailed"
          ? `inventory-detailed-report-${
              new Date().toISOString().split("T")[0]
            }.pdf`
          : `inventory-report-${new Date().toISOString().split("T")[0]}.pdf`;

      doc.save(filename);

      setExportStatus(
        `✅ ${
          type === "detailed" ? "Detailed" : "Simple"
        } PDF generated successfully!`
      );
    } catch (error) {
      console.error("PDF export error:", error);
      setExportStatus("❌ PDF generation failed");
    } finally {
      setLoading(false);
      setTimeout(() => setExportStatus(""), 3000);
    }
  };

  // 6. Export All Formats
  const handleExport = async () => {
    if (exportFormat === "pdf") {
      await handleExportPDF("detailed");
    } else if (exportFormat === "pdf-detailed") {
      await handleExportPDF("detailed");
    } else {
      await handleExportData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Tools</h1>
          <p className="text-gray-600">Manage and export your inventory data</p>
        </div>
      </div>

      {/* System Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="font-medium">Data Export</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Export your inventory data for backup or analysis
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                disabled={loading}
              >
                <option value="csv">CSV (Excel)</option>
                <option value="json">JSON</option>
                {/* <option value="pdf">PDF Report</option> */}
                <option value="pdf">PDF Report</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50"
            >
              {loading
                ? exportFormat === "pdf"
                  ? "Generating PDF..."
                  : "Exporting..."
                : `Export as ${exportFormat.toUpperCase()}`}
            </button>

            {exportStatus && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  exportStatus.includes("✅")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {exportStatus}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <CloudArrowDownIcon className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="font-medium">Backup & Restore</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Create and manage database backups
          </p>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Last Backup</div>
              <div className="font-medium">
                {systemInfo?.lastBackup
                  ? new Date(systemInfo.lastBackup).toLocaleString()
                  : "Never"}
              </div>
            </div>

            <button
              onClick={handleBackup}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? "Creating Backup..." : "Create Backup Now"}
            </button>

            {backupStatus && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  backupStatus.includes("✅")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {backupStatus}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                Auto-backup schedule:
              </p>
              <p className="font-medium">Daily at 02:00 AM</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
            <h3 className="font-medium">System Maintenance</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Tools to keep your system running smoothly
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCheckLowStock}
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Check Low Stock
            </button>

            <button
              onClick={handleClearCache}
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear Cache
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh System
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">System Status</div>
            <div className="flex items-center mt-1">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="font-medium text-green-600">
                All systems operational
              </span>
            </div>
            {systemInfo && (
              <div className="text-xs text-gray-500 mt-2">
                Version: {systemInfo.version} | Products:{" "}
                {systemInfo.totalProducts} | Users: {systemInfo.totalUsers}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">System Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600">Total Products</div>
            <div className="text-2xl font-bold">
              {systemInfo?.totalProducts || 0}
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600">Active Users</div>
            <div className="text-2xl font-bold">
              {systemInfo?.totalUsers || 1}
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600">Low Stock Items</div>
            <div className="text-2xl font-bold">
              {systemInfo?.lowStockItems || 0}
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600">Database Size</div>
            <div className="text-2xl font-bold">
              {systemInfo?.dbSize || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="font-medium">System backup completed</p>
                <p className="text-sm text-gray-500">Full database backup</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">Today, 02:00 AM</span>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <DocumentArrowDownIcon className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="font-medium">Data export initiated</p>
                <p className="text-sm text-gray-500">CSV format</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">Yesterday, 15:30</span>
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-3" />
              <div>
                <p className="font-medium">Low stock alert</p>
                <p className="text-sm text-gray-500">
                  5 items below minimum stock
                </p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
