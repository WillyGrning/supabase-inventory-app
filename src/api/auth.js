// ❌ HAPUS INI SEMUA:
// import { register, login } from '../server/auth.service.js';
// import { createOtp } from '../server/otp.service.js';

// ✅ GANTI DENGAN INI (HANYA FETCH):

export async function registerApi(email, password) {
  try {
    // Langsung call backend API, TIDAK panggil local functions
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    console.log(`✅ ${data.message}`);
    
    return data; // Data sudah include user, otp, dll dari backend
    
  } catch (err) {
    console.error('Registration API error:', err);
    throw new Error(err.message || 'Registration failed');
  }
}

export async function loginApi(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Save token to localStorage
    if (data.token) {
      localStorage.setItem('session', data.token);
    }
    
    return data.token;
    
  } catch (err) {
    console.error('Login API error:', err);
    throw new Error(err.message || 'Login failed');
  }
}