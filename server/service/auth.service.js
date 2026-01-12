import { supabase } from '../supabase.js';
import { hashPassword, verifyPassword } from '../../src/utils/crypto.js';
import { generateSessionToken } from '../../src/utils/token.js';

export async function register(email, password) {
  const hash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ 
      email, 
      password_hash: hash,
      // No need to store separate salt with bcrypt
    })
    .select()
    .single();

  if (error) throw error;
  
  return { user };
}

export async function login(email, password) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) throw new Error('Invalid credentials');

  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) throw new Error('Invalid credentials');

  if (!user.verified) throw new Error('Email not verified');

  const token = generateSessionToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from('sessions').insert({
    user_id: user.id,
    token,
    expires_at: expires
  });

  if (error) throw error;

  return token;
}