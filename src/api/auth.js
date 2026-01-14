// // ❌ HAPUS INI SEMUA:
// // import { register, login } from '../server/auth.service.js';
// // import { createOtp } from '../server/otp.service.js';

// // ✅ GANTI DENGAN INI (HANYA FETCH):

// export async function registerApi(email, password) {
//   try {
//     // Langsung call backend API, TIDAK panggil local functions
//     const response = await fetch("/api/auth/register", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify({ email, password }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.error || "Registration failed");
//     }

//     console.log(`✅ ${data.message}`);

//     return data; // Data sudah include user, otp, dll dari backend
//   } catch (err) {
//     console.error("Registration API error:", err);
//     throw new Error(err.message || "Registration failed");
//   }
// }

// export async function loginApi(email, password) {
//   try {
//     const response = await fetch("/api/auth/login", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify({ email, password }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.error || "Login failed");
//     }

//     // Save token to localStorage
//     if (data.token) {
//       sessionStorage.setItem("session", data.token);
//       sessionStorage.setItem("user_id", data.user);
//     }

//     return data.token;
//   } catch (err) {
//     console.error("Login API error:", err);
//     throw new Error(err.message || "Login failed");
//   }
// }

// // Google Login functions
// export async function getGoogleAuthUrl() {
//   const response = await fetch("/api/auth/google");

//   if (!response.ok) {
//     throw new Error("Failed to get Google auth URL");
//   }

//   const data = await response.json();
//   return data.url;
// }

// export async function googleLogin(idToken) {
//   const response = await fetch("/api/auth/google/login", {
//     method: "POST",
//     headers: { "Content-Type": "application/json", Accept: "application/json" },
//     body: JSON.stringify({ idToken }),
//   });

//   const data = await response.json();

//   if (!response.ok) {
//     throw new Error(data.error || "Google login failed");
//   }

//   // Save token
//   if (data.token) {
//     sessionStorage.setItem("session", data.token);
//     sessionStorage.setItem("user_id", data.user);
//     sessionStorage.setItem("user", JSON.stringify(data.user));
//   }

//   return data;
// }

// // ========== FORGOT PASSWORD API FUNCTIONS ==========

// export async function forgotPasswordApi(email) {
//   try {
//     const response = await fetch('/api/auth/forgot-password', {
//       method: 'POST',
//       headers: { 
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       },
//       body: JSON.stringify({ email })
//     });
    
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.error || 'Failed to send reset code');
//     }
    
//     return data;
    
//   } catch (err) {
//     console.error('Forgot password API error:', err);
//     throw new Error(err.message || 'Failed to send reset code');
//   }
// }

// export async function verifyResetOtpApi(email, code) {
//   try {
//     const response = await fetch('/api/auth/verify-reset-otp', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email, code })
//     });
    
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.error || 'Invalid reset code');
//     }
    
//     return data;
    
//   } catch (err) {
//     console.error('Verify reset OTP API error:', err);
//     throw new Error(err.message || 'Invalid reset code');
//   }
// }

// export async function resetPasswordApi(resetToken, newPassword) {
//   try {
//     const response = await fetch('/api/auth/reset-password', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ resetToken, newPassword })
//     });
    
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.error || 'Failed to reset password');
//     }
    
//     return data;
    
//   } catch (err) {
//     console.error('Reset password API error:', err);
//     throw new Error(err.message || 'Failed to reset password');
//   }
// }

// export async function resendResetOtpApi(email) {
//   try {
//     const response = await fetch('/api/auth/resend-reset-otp', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email })
//     });
    
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.error || 'Failed to resend code');
//     }
    
//     return data;
    
//   } catch (err) {
//     console.error('Resend reset OTP API error:', err);
//     throw new Error(err.message || 'Failed to resend code');
//   }
// }


// ✅ TAMBAHKAN INI DI ATAS:
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ❌ JANGAN PAKAI PATH RELATIF:
// fetch("/api/auth/google") 

// ✅ GUNAKAN FULL URL:
// fetch(`${API_URL}/api/auth/google`)

export async function registerApi(email, password) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/register`, {
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

    return data;
  } catch (err) {
    console.error("Registration API error:", err);
    throw new Error(err.message || "Registration failed");
  }
}

export async function loginApi(email, password) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/login`, {
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
  // ✅ GANTI INI:
  const response = await fetch(`${API_URL}/api/auth/google`);

  if (!response.ok) {
    throw new Error("Failed to get Google auth URL");
  }

  const data = await response.json();
  return data.url;
}

export async function googleLogin(idToken) {
  // ✅ GANTI INI:
  const response = await fetch(`${API_URL}/api/auth/google/login`, {
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

// ========== FORGOT PASSWORD API FUNCTIONS ==========

export async function forgotPasswordApi(email) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send reset code');
    }
    
    return data;
    
  } catch (err) {
    console.error('Forgot password API error:', err);
    throw new Error(err.message || 'Failed to send reset code');
  }
}

export async function verifyResetOtpApi(email, code) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Invalid reset code');
    }
    
    return data;
    
  } catch (err) {
    console.error('Verify reset OTP API error:', err);
    throw new Error(err.message || 'Invalid reset code');
  }
}

export async function resetPasswordApi(resetToken, newPassword) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    
    return data;
    
  } catch (err) {
    console.error('Reset password API error:', err);
    throw new Error(err.message || 'Failed to reset password');
  }
}

export async function resendResetOtpApi(email) {
  try {
    // ✅ GANTI INI:
    const response = await fetch(`${API_URL}/api/auth/resend-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend code');
    }
    
    return data;
    
  } catch (err) {
    console.error('Resend reset OTP API error:', err);
    throw new Error(err.message || 'Failed to resend code');
  }
}