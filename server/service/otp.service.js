import { supabase } from '../supabase.js';

export async function createOtp(userId) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await supabase.from('verification_codes').insert({
    user_id: userId,
    code,
    expires_at: expires
  });

  return code;
}