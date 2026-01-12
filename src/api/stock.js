import { supabase } from '../server/supabase.js';
import { requireAuth } from '../server/auth.middleware.js';

export async function updateStock(token, productId, quantity) {
  await requireAuth(token);

  const { error } = await supabase.rpc('update_stock', {
    product_id: productId,
    qty: quantity
  });

  if (error) throw error;
}