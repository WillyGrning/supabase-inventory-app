import { supabase } from '../supabase.js';

export async function requireAuth(token) {
  if (!token) throw new Error('Unauthorized');

  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date())
    .single();

  if (!data) throw new Error('Session expired');
  return data.user_id;
}