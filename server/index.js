/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ========== EMAIL TRANSPORTER ========== // <-- TAMBAH INI
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test connection
transporter.verify((error) => {
  if (error) {
    console.log("❌ Email server error:", error.message);
  } else {
    console.log("✅ Email server is ready");
  }
});

// Helper functions
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ========== API ENDPOINTS ==========

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Backend API is running",
  });
});

// Register endpoint
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    console.log(`📝 Registering user: ${email}`);

    // 1. Hash password
    const hash = await bcrypt.hash(password, 10);

    // 2. Insert user to database
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: hash,
        verified: false,
        role: "user",
      })
      .select()
      .single();

    if (userError) {
      console.error("Supabase error:", userError);
      return res.status(400).json({ error: userError.message });
    }

    // 3. Generate OTP
    const otp = generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error: otpError } = await supabase
      .from("verification_codes")
      .insert({
        user_id: user.id,
        code: otp,
        expires_at: expires,
      });

    if (otpError) {
      console.error("OTP creation error:", otpError);
      return res.status(500).json({ error: "Failed to create OTP" });
    }

    const fromName =
      process.env.SMTP_FROM_NAME || "Inventory Management System";
    const fromEmail = process.env.SMTP_FROM_EMAIL;

    if (!process.env.SMTP_USER || process.env.NODE_ENV === "development") {
      // Development mode
      console.log(`🔐 [DEV] OTP for ${email}: ${otp}`);
      console.log(`   From: "${fromName}" <${fromEmail}>`);

      return res.json({
        success: true,
        message: "Registration successful! Check your email for OTP.",
        user: {
          id: user.id,
          email: user.email,
        },
        otp: otp, // For development/testing only
        simulated: true,
        preview: `From: "${fromName}" <${fromEmail}>`,
      });
    }

    // Production mode - send actual email
    // Production mode - send actual email
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Your OTP Code - ${fromName}`,
        text: `
      Your OTP verification code is: ${otp}
      
      Enter this code to verify your email address.
      This code will expire in 10 minutes.
      
      If you didn't request this code, please ignore this email.
      
      Best regards,
      ${fromName} Team
    `,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 30px; background: #f9fafb; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #e5e7eb; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${fromName}</h1>
          <p>Email Verification</p>
        </div>
        <div class="content">
          <h2>Welcome!</h2>
          <p>Thank you for registering. Use the following OTP code to verify your email address:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Best regards,<br><strong>${fromName} Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
      });

      console.log(`✅ Registration email sent to ${email}`);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Continue anyway, OTP is saved in database
    }

    res.json({
      success: true,
      message: "Registration successful! Check your email for OTP.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    console.log(`🔑 Login attempt for: ${email}`);

    // 1. Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Check if email is verified
    if (!user.verified) {
      return res.status(401).json({ error: "Please verify your email first" });
    }

    // 4. Create session token
    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: user.id,
      token: token,
      expires_at: expires,
    });

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return res.status(500).json({ error: "Failed to create session" });
    }

    // 5. Return success
    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ========== USERS MANAGEMENT API (Admin Only) ==========

// GET all users (admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Check if user is admin
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    if (user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get all users with additional stats
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        role,
        verified,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    if (usersError) throw usersError;

    // Get product count for each user
    const userIds = users.map((u) => u.id);
    const { data: productCounts } = await supabase
      .from("products")
      .select("user_id")
      .in("user_id", userIds);

    // Create product count map
    const productCountMap = {};
    productCounts?.forEach((p) => {
      productCountMap[p.user_id] = (productCountMap[p.user_id] || 0) + 1;
    });

    // Combine user data with product counts
    const usersWithStats = users.map((user) => ({
      ...user,
      product_count: productCountMap[user.id] || 0,
    }));

    res.json({
      success: true,
      data: usersWithStats,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single user details (admin only)
app.get("/api/admin/users/:id", async (req, res) => {
  try {
    // Admin verification (same as above)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const userId = req.params.id;

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    const { data: adminUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    if (adminUser?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        role,
        verified,
        created_at,
        updated_at
      `
      )
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, sku, quantity, unit_price")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Calculate stats
    const totalProducts = products?.length || 0;
    const totalValue =
      products?.reduce((sum, p) => sum + p.quantity * p.unit_price, 0) || 0;

    res.json({
      success: true,
      data: {
        ...user,
        products: products || [],
        stats: {
          total_products: totalProducts,
          total_inventory_value: totalValue,
          last_login: user.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Tambah setelah login endpoint
// ========== PRODUCTS API ENDPOINTS ==========

// GET all products
app.get("/api/products", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    const userRole = user?.role || "user";

    // Base query
    let query = supabase.from("products").select("*");

    // Apply filters based on role
    if (userRole !== "admin") {
      query = query.eq("user_id", session.user_id);
    }

    // Execute query
    const { data: products, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    // Try to get categories separately
    const categoryIds =
      products
        ?.map((p) => p.category_id)
        .filter((id) => id)
        .filter((id, index, self) => self.indexOf(id) === index) || [];

    let categoryMap = {};
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", categoryIds);

      categories?.forEach((cat) => {
        categoryMap[cat.id] = cat.name;
      });
    }

    // Combine products with category names
    const productsWithCategories =
      products?.map((product) => ({
        ...product,
        categories: {
          name: categoryMap[product.category_id] || "Uncategorized",
        },
      })) || [];

    res.json({
      success: true,
      data: productsWithCategories,
      userRole: userRole,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create new product
app.post("/api/products", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    // Validation
    const {
      name,
      sku,
      category_id,
      quantity,
      min_stock,
      unit_price,
      description,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: "SKU is required" });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    if (unit_price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    // Check if SKU already exists for this user
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("user_id", session.user_id)
      .eq("sku", sku.trim())
      .single();

    if (existingProduct) {
      return res
        .status(400)
        .json({ error: "SKU already exists for this user" });
    }

    // Insert product
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: session.user_id,
        name: name.trim(),
        sku: sku.trim(),
        category_id: category_id || null,
        quantity: quantity || 0,
        min_stock: min_stock || 10,
        unit_price: unit_price || 0,
        description: description?.trim() || null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert product error:", insertError);
      return res.status(500).json({ error: "Failed to create product" });
    }

    // Get category name if category_id exists
    let categoryName = "Uncategorized";
    if (product.category_id) {
      const { data: category } = await supabase
        .from("categories")
        .select("name")
        .eq("id", product.category_id)
        .single();

      if (category) {
        categoryName = category.name;
      }
    }

    const productWithCategory = {
      ...product,
      categories: {
        name: categoryName,
      },
    };

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: productWithCategory,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT update product
app.put("/api/products/:id", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const productId = req.params.id;

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    const userRole = user?.role || "user";

    // Check if product exists and user has permission
    let productQuery = supabase
      .from("products")
      .select("*")
      .eq("id", productId);

    if (userRole !== "admin") {
      productQuery = productQuery.eq("user_id", session.user_id);
    }

    const { data: existingProduct, error: fetchError } =
      await productQuery.single();

    if (fetchError || !existingProduct) {
      return res
        .status(404)
        .json({ error: "Product not found or unauthorized" });
    }

    // Validation
    const {
      name,
      sku,
      category_id,
      quantity,
      min_stock,
      unit_price,
      description,
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Product name cannot be empty" });
    }

    if (sku !== undefined) {
      // Check if new SKU already exists for this user (excluding current product)
      const { data: skuCheck } = await supabase
        .from("products")
        .select("id")
        .eq("user_id", session.user_id)
        .eq("sku", sku.trim())
        .neq("id", productId)
        .single();

      if (skuCheck) {
        return res
          .status(400)
          .json({ error: "SKU already exists for this user" });
      }
    }

    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (sku !== undefined) updateData.sku = sku.trim();
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (min_stock !== undefined) updateData.min_stock = min_stock;
    if (unit_price !== undefined) updateData.unit_price = unit_price;
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    updateData.updated_at = new Date().toISOString();

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Update product error:", updateError);
      return res.status(500).json({ error: "Failed to update product" });
    }

    // Get category name
    let categoryName = "Uncategorized";
    if (updatedProduct.category_id) {
      const { data: category } = await supabase
        .from("categories")
        .select("name")
        .eq("id", updatedProduct.category_id)
        .single();

      if (category) {
        categoryName = category.name;
      }
    }

    const productWithCategory = {
      ...updatedProduct,
      categories: {
        name: categoryName,
      },
    };

    res.json({
      success: true,
      message: "Product updated successfully",
      data: productWithCategory,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE product
app.delete("/api/products/:id", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const productId = req.params.id;

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    const userRole = user?.role || "user";

    // Check if product exists and user has permission
    let productQuery = supabase
      .from("products")
      .select("*")
      .eq("id", productId);

    if (userRole !== "admin") {
      productQuery = productQuery.eq("user_id", session.user_id);
    }

    const { data: existingProduct, error: fetchError } =
      await productQuery.single();

    if (fetchError || !existingProduct) {
      return res
        .status(404)
        .json({ error: "Product not found or unauthorized" });
    }

    // Delete product
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      console.error("Delete product error:", deleteError);
      return res.status(500).json({ error: "Failed to delete product" });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET single product
app.get("/api/products/:id", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const productId = req.params.id;

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    const userRole = user?.role || "user";

    // Build query
    let query = supabase.from("products").select("*").eq("id", productId);

    if (userRole !== "admin") {
      query = query.eq("user_id", session.user_id);
    }

    const { data: product, error } = await query.single();

    if (error || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get category name
    let categoryName = "Uncategorized";
    if (product.category_id) {
      const { data: category } = await supabase
        .from("categories")
        .select("name")
        .eq("id", product.category_id)
        .single();

      if (category) {
        categoryName = category.name;
      }
    }

    const productWithCategory = {
      ...product,
      categories: {
        name: categoryName,
      },
    };

    res.json({
      success: true,
      data: productWithCategory,
    });
  } catch (error) {
    console.error("Get single product error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== CATEGORIES API ENDPOINTS ==========

// GET all categories
app.get("/api/categories", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user_id)
      .single();

    const userRole = user?.role || "user";

    let query = supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    // Apply filters based on role
    if (userRole !== "admin") {
      query = query.eq("user_id", session.user_id);
    }

    const { data: categories, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create category
app.post("/api/categories", async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) return res.status(401).json({ error: "Session expired" });

    // Validation
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category already exists for this user
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", session.user_id)
      .eq("name", name.trim())
      .single();

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category already exists for this user" });
    }

    // Insert category
    const { data: category, error: insertError } = await supabase
      .from("categories")
      .insert({
        user_id: session.user_id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert category error:", insertError);
      return res.status(500).json({ error: "Failed to create category" });
    }

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      data: category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Send OTP endpoint (standalone)
// Send OTP endpoint (standalone)
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP required" });
    }

    // Customize sender name
    const fromName =
      process.env.SMTP_FROM_NAME || "Inventory Management System";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    console.log(`📧 Attempting to send OTP to: ${email}`);

    // Check if email is configured
    if (!process.env.SMTP_USER || process.env.NODE_ENV === "development") {
      // Development mode - simulate email
      console.log(`🔐 [DEV] OTP for ${email}: ${otp}`);
      console.log(`   From: "${fromName}" <${fromEmail}>`);

      return res.json({
        success: true,
        message: "OTP sent successfully (simulated for development)",
        simulated: true,
        otp: otp,
        preview: `From: "${fromName}" <${fromEmail}>`,
      });
    }

    // Production mode - send actual email
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: `Your OTP Code - ${fromName}`,
      text: `
        Your OTP verification code is: ${otp}
        
        Enter this code to verify your email address.
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        ${fromName} Team
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; background: #f9fafb; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #e5e7eb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${fromName}</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <h2>Hello,</h2>
            <p>Use the following OTP code to verify your email address:</p>
            <div class="otp-code">${otp}</div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Best regards,<br><strong>${fromName} Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${email}: ${info.messageId}`);

    res.json({
      success: true,
      message: "OTP sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    res.status(500).json({
      error: "Failed to send OTP email",
      details: error.message,
    });
  }
});

// Verify OTP endpoint
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and OTP code required" });
    }

    console.log(`🔍 Verifying OTP for ${email}: ${code}`);

    // 1. Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Check OTP
    const { data: otpRecord } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // 3. Mark OTP as used
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // 4. Mark user as verified
    await supabase.from("users").update({ verified: true }).eq("id", user.id);

    res.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: "Server error during verification" });
  }
});

// Tambah setelah verify-otp endpoint
app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate new OTP
    const otp = generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old OTPs
    await supabase.from("verification_codes").delete().eq("user_id", user.id);

    // Create new OTP
    await supabase.from("verification_codes").insert({
      user_id: user.id,
      code: otp,
      expires_at: expires,
    });

    // Simulate sending email
    console.log(`📧 [RESEND] New OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: "OTP baru telah dikirim",
      otp: otp, // For development
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// server/index.js
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // Verify session
    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return res.status(401).json({ error: "Session expired" });
    }

    // Get user data
    const { data: user } = await supabase
      .from("users")
      .select("email, role, verified")
      .eq("id", session.user_id)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        email: user.email,
        role: user.role || "user",
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout endpoint
app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ success: true }); // Already logged out
    }

    const token = authHeader.split(" ")[1];

    // Delete session from database
    await supabase.from("sessions").delete().eq("token", token);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/send-otp`);
  console.log(`   POST /api/auth/verify-otp`);
});
