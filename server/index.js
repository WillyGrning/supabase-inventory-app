/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { requireAuthMiddleware } from "./middleware/auth.middleware.js";
import { Resend } from "resend";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Public client (user-context)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client (server-only, bypass RLS)
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// ========== EMAIL TRANSPORTER ========== // <-- TAMBAH INI
// const transporter = nodemailer.createTransport({
//   host: 'smtp-relay.brevo.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// // Test connection
// transporter.verify((error) => {
//   if (error) {
//     console.log("❌ Email server error:", error.message);
//   } else {
//     console.log("✅ Email server is ready");
//   }
// });

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

// Google OAuth Client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === "production"
    ? process.env.GOOGLE_REDIRECT_URI
    : "http://localhost:3001/api/auth/callback/google"
);

// Google Login URL endpoint
app.get("/api/auth/google", (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    prompt: "select_account",
  });

  res.json({ url });
});

// Google Callback endpoint
app.get("/api/auth/callback/google", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info from Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    console.log(`🔑 Google login attempt: ${email}`);

    // Check if user exists
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    // Create user if doesn't exist
    if (!user) {
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email,
          name: name || email.split("@")[0],
          google_id: googleId,
          verified: true, // Google users are automatically verified
          avatar_url: picture,
          role: "user",
          login_method: "google",
        })
        .select()
        .single();

      if (userError) throw userError;
      user = newUser;

      console.log(`✅ New user created via Google: ${email}`);
    } else {
      // Update existing user with Google info
      await supabase
        .from("users")
        .update({
          google_id: googleId,
          avatar_url: picture,
          verified: true,
        })
        .eq("id", user.id);

      console.log(`✅ Existing user logged in via Google: ${email}`);
    }

    // Create session token
    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from("sessions").insert({
      user_id: user.id,
      token,
      expires_at: expires,
    });

    // Redirect to frontend with token
    const redirectUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/auth/callback?token=${token}&email=${encodeURIComponent(email)}`;
    // Di Google callback, sebelum res.redirect():
    console.log("=== GOOGLE AUTH REDIRECT ===");
    console.log("Token:", token);
    console.log("Email:", email);
    console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
    console.log(
      "Redirect URL:",
      `${
        process.env.FRONTEND_URL
      }/auth/callback?token=${token}&email=${encodeURIComponent(email)}`
    );
    console.log("=== END LOG ===");
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/login?error=google_auth_failed`
    );
  }
});

// Google Login endpoint (for mobile/desktop)
app.post("/api/auth/google/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token required" });
    }

    // Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Same logic as callback endpoint
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) {
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email,
          name: name || email.split("@")[0],
          google_id: googleId,
          verified: true,
          avatar_url: picture,
          role: "user",
          login_method: "google",
        })
        .select()
        .single();

      if (userError) throw userError;
      user = newUser;
    }

    // Create session
    const token = generateSessionToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from("sessions").insert({
      user_id: user.id,
      token,
      expires_at: expires,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar_url,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
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
        login_method: "email",
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

    // // 4. Send OTP via email
    // const fromName =
    //   process.env.SMTP_FROM_NAME || "Inventory Management System";
    // const fromEmail = process.env.SMTP_FROM_EMAIL;

    // if (!process.env.SMTP_USER || process.env.NODE_ENV === "development") {
    //   // Development mode
    //   console.log(`🔐 [DEV] OTP for ${email}: ${otp}`);
    //   console.log(`   From: "${fromName}" <${fromEmail}>`);

    //   return res.json({
    //     success: true,
    //     message: "Registration successful! Check your email for OTP.",
    //     user: {
    //       id: user.id,
    //       email: user.email,
    //     },
    //     otp: otp, // For development/testing only
    //     simulated: true,
    //     preview: `From: "${fromName}" <${fromEmail}>`,
    //   });
    // }

    // // Production mode - send actual email
    // try {
    //   await transporter.sendMail({
    //     from: `"${fromName}" <${fromEmail}>`,
    //     to: email,
    //     subject: `Your OTP Code - ${fromName}`,
    //     text: `
    //   Your OTP verification code is: ${otp}

    //   Enter this code to verify your email address.
    //   This code will expire in 10 minutes.

    //   If you didn't request this code, please ignore this email.

    //   Best regards,
    //   ${fromName} Team
    // `,
    //     html: `
    //   <!DOCTYPE html>
    //   <html>
    //   <head>
    //     <meta charset="utf-8">
    //     <style>
    //       body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    //       .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    //       .content { padding: 30px; background: #f9fafb; }
    //       .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #e5e7eb; }
    //       .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    //     </style>
    //   </head>
    //   <body>
    //     <div class="header">
    //       <h1>${fromName}</h1>
    //       <p>Email Verification</p>
    //     </div>
    //     <div class="content">
    //       <h2>Welcome!</h2>
    //       <p>Thank you for registering. Use the following OTP code to verify your email address:</p>
    //       <div class="otp-code">${otp}</div>
    //       <p>This code will expire in <strong>10 minutes</strong>.</p>
    //       <p>If you didn't request this code, please ignore this email.</p>
    //       <p>Best regards,<br><strong>${fromName} Team</strong></p>
    //     </div>
    //     <div class="footer">
    //       <p>This is an automated message, please do not reply.</p>
    //       <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    //     </div>
    //   </body>
    //   </html>
    // `,
    //   });

    //   console.log(`✅ Registration email sent to ${email}`);
    // } catch (emailError) {
    //   console.error("Email sending failed:", emailError);
    //   // Continue anyway, OTP is saved in database
    // }

    // res.json({
    //   success: true,
    //   message: "Registration successful! Check your email for OTP.",
    //   user: {
    //     id: user.id,
    //     email: user.email,
    //   },
    // });
    // ✅ 4. Send OTP via Resend
    const emailResult = await sendOtpEmail(email, otp, "verification");

    // Untuk development atau jika Resend gagal
    if (!emailResult.success || process.env.NODE_ENV === "development") {
      console.log(`🔐 [DEV] OTP for ${email}: ${otp}`);

      return res.json({
        success: true,
        message: "Registration successful! Check your email for OTP.",
        user: {
          id: user.id,
          email: user.email,
        },
        otp: otp, // Kirim OTP untuk development
        simulated: !emailResult.success,
        emailSent: emailResult.success,
      });
    }

    // Jika email berhasil dikirim
    res.json({
      success: true,
      message: "Registration successful! Check your email for OTP.",
      user: {
        id: user.id,
        email: user.email,
      },
      emailSent: true,
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

    await supabase.from("sessions").delete().eq("user_id", user.id);

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
      .maybeSingle();

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
      .maybeSingle();

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
    console.log("AUTH HEADER:", req.headers.authorization);

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
      .maybeSingle();

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
      .maybeSingle();

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

// Analytic endpoints
app.get(
  "/api/analytics/inventory-stats",
  requireAuthMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      // Get total items and value
      const { data: stats, error: statsError } = await supabase
        .from("products")
        .select("quantity, unit_price, min_stock")
        .eq("user_id", userId);

      if (statsError) throw statsError;

      let totalItems = 0;
      let totalValue = 0;
      let lowStockItems = 0;
      let outOfStockItems = 0;
      let totalUnitPrice = 0;

      stats.forEach((product) => {
        const quantity = product.quantity || 0;
        const unitPrice = parseFloat(product.unit_price) || 0;
        const minStock = product.min_stock || 10;

        totalItems += quantity;
        totalValue += quantity * unitPrice;
        totalUnitPrice += unitPrice;

        if (quantity === 0) {
          outOfStockItems++;
        } else if (quantity <= minStock) {
          lowStockItems++;
        }
      });

      const avgUnitPrice = stats.length > 0 ? totalUnitPrice / stats.length : 0;

      res.json({
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        avgUnitPrice,
        totalProducts: stats.length,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  }
);

// Category distribution endpoint
app.get(
  "/api/analytics/category-distribution",
  requireAuthMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      const { data, error } = await supabase
        .from("products")
        .select(
          `
        quantity,
        unit_price,
        category_id,
        categories (name)
      `
        )
        .eq("user_id", userId);

      if (error) throw error;

      // Group by category
      const categoryMap = {};

      data.forEach((product) => {
        const categoryName = product.categories?.name || "Uncategorized";
        const quantity = product.quantity || 0;
        const unitPrice = parseFloat(product.unit_price) || 0;
        const value = quantity * unitPrice;

        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = {
            category_name: categoryName,
            total_value: 0,
            item_count: 0,
          };
        }

        categoryMap[categoryName].total_value += value;
        categoryMap[categoryName].item_count += quantity > 0 ? 1 : 0;
      });

      const result = Object.values(categoryMap);

      res.json(result);
    } catch (error) {
      console.error("Category distribution error:", error);
      res.json([]); // Return empty array if error
    }
  }
);

// System Info
app.get("/api/system/info", requireAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Product count
    const { count: productCount, error: productError } = await supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (productError) throw productError;

    // Low stock count - query manual
    const { data: lowStockData, error: lowStockError } = await supabase
      .from("products")
      .select("quantity, min_stock")
      .eq("user_id", userId);

    if (lowStockError) throw lowStockError;

    // Calculate low stock manually
    const lowStockCount =
      lowStockData?.filter(
        (p) =>
          p.quantity !== null &&
          p.min_stock !== null &&
          p.quantity <= p.min_stock
      ).length || 0;

    // Get last backup
    let lastBackup = null;
    try {
      const { data: backupData } = await supabase
        .from("backup_logs")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      lastBackup = backupData?.created_at;
    } catch (backupError) {
      // Table mungkin belum ada, ignore
      console.log("Backup logs table not found or empty");
    }

    res.json({
      totalProducts: productCount || 0,
      lowStockItems: lowStockCount,
      totalUsers: 1,
      lastBackup,
      version: "1.0.0",
      dbSize: "N/A",
    });
  } catch (error) {
    console.error("System info error:", error);
    res.status(500).json({
      error: "Failed to fetch system info",
      details: error.message,
    });
  }
});

// Export Data
app.get("/api/system/export", requireAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const format = req.query.format || "csv";

    // Get all products
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (format === "csv") {
      // Convert to CSV
      const headers = [
        "ID",
        "Name",
        "SKU",
        "Quantity",
        "Min Stock",
        "Unit Price",
        "Category",
      ];
      const csvRows = [
        headers.join(","),
        ...products.map((p) =>
          [
            p.id,
            `"${p.name?.replace(/"/g, '""')}"`,
            p.sku,
            p.quantity,
            p.min_stock,
            p.unit_price,
            p.category_id,
          ].join(",")
        ),
      ];

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inventory-export.csv"
      );
      res.send(csvRows.join("\n"));
    } else if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inventory-export.json"
      );
      res.json(products);
    } else {
      res.status(400).json({ error: "Unsupported format" });
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

// Create Backup
app.post("/api/system/backup", requireAuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;

    // Get all data
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId);

    const backupData = {
      timestamp: new Date().toISOString(),
      userId,
      products: products || [],
      metadata: {
        totalItems: products?.length || 0,
        systemVersion: "1.0.0",
      },
    };

    // Log backup (simulate saving to database)
    await supabase.from("backup_logs").insert({
      user_id: userId,
      filename,
      item_count: products?.length || 0,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Backup created successfully",
      filename,
      timestamp: new Date().toISOString(),
      itemCount: products?.length || 0,
    });
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ error: "Backup failed" });
  }
});

// Clear Cache (simulated)
app.post("/api/system/clear-cache", requireAuthMiddleware, async (req, res) => {
  try {
    // In a real app, you would clear Redis/memory cache
    // For now, just return success
    res.json({
      success: true,
      message: "Cache cleared successfully",
      clearedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Send OTP endpoint (standalone)
// Send OTP endpoint (standalone)
// ✅ FUNCTION UNTUK KIRIM EMAIL DENGAN RESEND
// ✅ REUSABLE FUNCTION UNTUK KIRIM EMAIL DENGAN RESEND
async function sendEmailWithResend(options) {
  try {
    const { to, subject, html, text } = options;
    const fromName =
      process.env.SMTP_FROM_NAME || "Inventory Management System";
    const fromEmail = process.env.SMTP_FROM_EMAIL || "onboarding@resend.dev";

    console.log(`📧 [Resend] Sending email to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Email sent via Resend, ID:", data?.id);
    return { success: true, data: data };
  } catch (error) {
    console.error("❌ Send email error:", error);
    return { success: false, error: error.message };
  }
}

// ✅ FUNCTION KHUSUS UNTUK OTP EMAIL
async function sendOtpEmail(email, otp, type = "verification") {
  const fromName = process.env.SMTP_FROM_NAME || "Inventory Management System";

  const subject =
    type === "verification"
      ? `Your OTP Code - ${fromName}`
      : `Password Reset Code - ${fromName}`;

  const headerText =
    type === "verification" ? "Email Verification" : "Password Reset Request";

  const mainText =
    type === "verification"
      ? "Use the following OTP code to verify your email address:"
      : "You requested to reset your password. Use this code:";

  const actionText =
    type === "verification"
      ? "verify your email address"
      : "reset your password";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { 
          background: ${
            type === "verification"
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          }; 
          padding: 30px; text-align: center; color: white; 
        }
        .content { padding: 30px; background: #f9fafb; }
        .otp-code { 
          font-size: 32px; 
          font-weight: bold; 
          letter-spacing: 10px; 
          text-align: center; 
          margin: 30px 0; 
          padding: 20px; 
          background: white; 
          border-radius: 10px; 
          border: 2px dashed #e5e7eb;
          font-family: 'Courier New', monospace;
        }
        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .warning { 
          background: #fef3c7; 
          border-left: 4px solid #f59e0b; 
          padding: 15px; 
          margin: 20px 0; 
          display: ${type === "verification" ? "none" : "block"};
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${fromName}</h1>
        <p>${headerText}</p>
      </div>
      <div class="content">
        <h2>Hello${type === "verification" ? "!" : ","}</h2>
        <p>${mainText}</p>
        
        <div class="otp-code">${otp}</div>
        
        <p>Enter this code to ${actionText}.</p>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        
        <div class="warning">
          <p><strong>⚠️ Security Notice:</strong></p>
          <p>If you didn't request a password reset, please ignore this email or contact support.</p>
        </div>
        
        <p>If you didn't request this code, please ignore this email.</p>
        <p>Best regards,<br><strong>${fromName} Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message, please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text =
    type === "verification"
      ? `Your OTP verification code is: ${otp}\n\nEnter this code to verify your email address.\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\n${fromName} Team`
      : `Your password reset code is: ${otp}\n\nEnter this code to reset your password.\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\n${fromName} Team`;

  return await sendEmailWithResend({
    to: email,
    subject,
    html,
    text,
  });
}

// ✅ PERBAIKAN ENDPOINT SEND OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP required" });
    }

    console.log(`📧 Attempting to send OTP to: ${email}`);

    // ✅ GUNAKAN RESEND UNTUK SEMUA ENVIRONMENT
    const emailResult = await sendOtpEmailResend(email, otp);

    if (emailResult.success) {
      // Email berhasil dikirim via Resend
      return res.json({
        success: true,
        message: "OTP sent successfully",
        messageId: emailResult.data?.id,
      });
    } else {
      // Resend gagal, fallback ke development mode
      console.log(`🔐 [FALLBACK] OTP for ${email}: ${otp}`);

      return res.json({
        success: true,
        message: "OTP generated. Check console/logs for code.",
        simulated: true,
        otp: otp, // Kirim OTP di response untuk development
        error: emailResult.error, // Optional: kasih tahu error
      });
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    res.status(500).json({
      error: "Failed to send OTP email",
      details: error.message,
    });
  }
});

// ✅ PERBAIKAN ENDPOINT VERIFY OTP (TETAP SAMA)
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

// ✅ PERBAIKAN ENDPOINT RESEND OTP
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

    console.log(`📧 [RESEND] New OTP generated for ${email}: ${otp}`);

    // ✅ GUNAKAN RESEND UNTUK KIRIM EMAIL
    const emailResult = await sendOtpEmailResend(email, otp);

    if (emailResult.success) {
      return res.json({
        success: true,
        message: "New OTP has been sent to your email",
      });
    } else {
      // Fallback jika Resend gagal
      return res.json({
        success: true,
        message: "New OTP generated. Check logs for code.",
        otp: otp, // Kirim OTP di response
        error: emailResult.error,
      });
    }
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

// ========== FORGOT PASSWORD ENDPOINTS ==========

// Request password reset (send OTP)
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`🔐 Forgot password request for: ${email}`);

    // 1. Check if user exists
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, verified")
      .eq("email", email)
      .single();

    if (!user) {
      // For security, don't reveal if user exists or not
      console.log(`⚠️  User not found for email: ${email}`);
      return res.json({
        success: true,
        message: "If your email exists, you will receive a reset code",
      });
    }

    // 2. Check if email is verified
    if (!user.verified) {
      return res.status(400).json({
        error: "Please verify your email first before resetting password",
      });
    }

    // 3. Generate OTP
    const otp = generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Delete any existing reset codes
    await supabaseAdmin.from("password_resets").delete().eq("user_id", user.id);

    // 5. Create new reset record
    const { error: resetError } = await supabaseAdmin
      .from("password_resets")
      .insert({
        user_id: user.id,
        code: otp,
        expires_at: expires,
        used: false,
      });

    if (resetError) {
      console.error("Reset creation error:", resetError);
      return res.status(500).json({ error: "Failed to create reset code" });
    }

    // // 6. Send OTP via email
    // const fromName =
    //   process.env.SMTP_FROM_NAME || "Inventory Management System";
    // const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    // if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    //   try {
    //     await transporter.sendMail({
    //       from: `"${fromName}" <${fromEmail}>`,
    //       to: email,
    //       subject: `Password Reset Code - ${fromName}`,
    //       text: `
    //         You requested to reset your password.

    //         Your password reset code is: ${otp}

    //         This code will expire in 10 minutes.

    //         If you didn't request this, please ignore this email.

    //         Best regards,
    //         ${fromName} Team
    //       `,
    //       html: `
    //         <!DOCTYPE html>
    //         <html>
    //         <head>
    //           <meta charset="utf-8">
    //           <style>
    //             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    //             .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white; }
    //             .content { padding: 30px; background: #f9fafb; }
    //             .reset-code { font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; border: 2px dashed #e5e7eb; }
    //             .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
    //             .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    //           </style>
    //         </head>
    //         <body>
    //           <div class="header">
    //             <h1>${fromName}</h1>
    //             <p>Password Reset Request</p>
    //           </div>
    //           <div class="content">
    //             <h2>Hello,</h2>
    //             <p>You recently requested to reset your password for your ${fromName} account.</p>

    //             <div class="reset-code">${otp}</div>

    //             <p>Enter this code on the password reset page to set a new password.</p>

    //             <div class="warning">
    //               <p><strong>⚠️ Security Notice:</strong></p>
    //               <p>This code will expire in <strong>10 minutes</strong>.</p>
    //               <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
    //             </div>

    //             <p>Best regards,<br><strong>${fromName} Team</strong></p>
    //           </div>
    //           <div class="footer">
    //             <p>This is an automated message, please do not reply.</p>
    //             <p>&copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    //           </div>
    //         </body>
    //         </html>
    //       `,
    //     });

    //     console.log(`✅ Reset email sent to ${email}`);
    //   } catch (emailError) {
    //     console.error("Email sending failed:", emailError.message);
    //     // Continue, OTP is logged for manual verification
    //   }
    // }

    // // For development or if email fails
    // console.log(`🔐 Reset code for ${email}: ${otp}`);

    // res.json({
    //   success: true,
    //   message: "Reset code sent to your email",
    //   email: email,
    //   otp: process.env.NODE_ENV === "development" ? otp : undefined,
    // });
    // ✅ 6. Send OTP via Resend
    const emailResult = await sendOtpEmail(email, otp, "reset");

    // Untuk development atau jika Resend gagal
    if (!emailResult.success || process.env.NODE_ENV === "development") {
      console.log(`🔐 [DEV] Reset code for ${email}: ${otp}`);

      return res.json({
        success: true,
        message: "Reset code generated. Check logs for code.",
        email: email,
        otp: otp, // Kirim OTP untuk development
        simulated: !emailResult.success,
        emailSent: emailResult.success,
      });
    }

    // Jika email berhasil dikirim
    res.json({
      success: true,
      message: "Reset code sent to your email",
      email: email,
      emailSent: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify reset OTP
app.post("/api/auth/verify-reset-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    console.log(`🔍 Verifying reset OTP for: ${email}`);

    // 1. Get user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Check reset code
    const { data: resetRecord } = await supabaseAdmin
      .from("password_resets")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    // 3. Mark code as used
    await supabaseAdmin
      .from("password_resets")
      .update({ used: true })
      .eq("id", resetRecord.id);

    // 4. Generate reset token (short-lived)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await supabaseAdmin
      .from("password_resets")
      .update({
        reset_token: resetToken,
        token_expires_at: tokenExpires,
      })
      .eq("id", resetRecord.id);

    res.json({
      success: true,
      message: "Reset code verified successfully",
      resetToken: resetToken,
      expiresAt: tokenExpires,
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset password with token
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ error: "Reset token and new password are required" });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    console.log(`🔄 Processing password reset with token`);

    // 1. Find valid reset record
    const { data: resetRecord } = await supabaseAdmin
      .from("password_resets")
      .select("*, users(id, email)")
      .eq("reset_token", resetToken)
      .eq("used", true) // Must be marked as used (verified)
      .gt("token_expires_at", new Date().toISOString())
      .single();

    if (!resetRecord) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // 2. Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // 3. Update user password
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resetRecord.user_id);

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(500).json({ error: "Failed to update password" });
    }

    // 4. Delete all reset records for this user
    await supabaseAdmin
      .from("password_resets")
      .delete()
      .eq("user_id", resetRecord.user_id);

    // 5. Invalidate all sessions (optional but recommended)
    await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("user_id", resetRecord.user_id);

    console.log(`✅ Password reset for user: ${resetRecord.users?.email}`);

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Resend reset OTP
app.post("/api/auth/resend-reset-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Similar to forgot-password but with rate limiting
    // (Implement rate limiting here - simple version)

    // For now, just call forgot-password again
    // In production, add rate limiting logic

    // Get existing reset record
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!user) {
      return res.json({
        success: true,
        message: "If your email exists, you will receive a reset code",
      });
    }

    // Delete existing reset
    await supabaseAdmin.from("password_resets").delete().eq("user_id", user.id);

    // Generate new OTP
    const otp = generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await supabaseAdmin.from("password_resets").insert({
      user_id: user.id,
      code: otp,
      expires_at: expires,
      used: false,
    });

    // Log for development
    console.log(`🔐 [RESEND] Reset code for ${email}: ${otp}`);

    res.json({
      success: true,
      message: "New reset code sent",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Resend reset OTP error:", error);
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
