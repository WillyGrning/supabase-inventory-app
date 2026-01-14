/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables untuk Node.js
dotenv.config();

// Gunakan process.env, BUKAN import.meta.env!
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_ANON_KEY:', !!supabaseKey);
  throw new Error('Supabase configuration missing. Check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  })
  .catch(err => {
    console.error('❌ Supabase connection failed:', err.message);
  });