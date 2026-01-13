// ❌ HAPUS INI SEMUA:
// import { register, login } from '../server/auth.service.js';
// import { createOtp } from '../server/otp.service.js';

// ✅ GANTI DENGAN INI (HANYA FETCH):

export async function registerApi(email, password) {
  try {
    // Langsung call backend API, TIDAK panggil local functions
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    console.log(`✅ ${data.message}`);

    return data; // Data sudah include user, otp, dll dari backend
  } catch (err) {
    console.error("Registration API error:", err);
    throw new Error(err.message || "Registration failed");
  }
}

export async function loginApi(email, password) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Save token to localStorage
    if (data.token) {
      sessionStorage.setItem("session", data.token);
      sessionStorage.setItem("user_id", data.user);
    }

    return data.token;
  } catch (err) {
    console.error("Login API error:", err);
    throw new Error(err.message || "Login failed");
  }
}

// Google Login functions
export async function getGoogleAuthUrl() {
  const response = await fetch("/api/auth/google");

  if (!response.ok) {
    throw new Error("Failed to get Google auth URL");
  }

  const data = await response.json();
  return data.url;
}

export async function googleLogin(idToken) {
  const response = await fetch("/api/auth/google/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Google login failed");
  }

  // Save token
  if (data.token) {
    sessionStorage.setItem("session", data.token);
    sessionStorage.setItem("user_id", data.user);
    sessionStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
}
