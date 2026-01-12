import { supabase } from '../supabase.js';
import { generateSessionToken } from '../../src/utils/token.js';
import { minutesFromNow } from '../../src/utils/time.js';

export async function createSession(userId) {
  const token = generateSessionToken();
  const expiresAt = minutesFromNow(60 * 24 * 7); // 7 days

  const { error } = await supabase.from('sessions').insert({
    user_id: userId,
    token,
    expires_at: expiresAt
  });

  if (error) throw error;
  return token;
}