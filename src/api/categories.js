import { supabase } from '../server/supabase.js';
import { requireAuth } from '../server/auth.middleware.js';

export async function getCategories(token) {
  await requireAuth(token);

  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) throw error;
  return data;
}