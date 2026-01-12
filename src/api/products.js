// Frontend API call untuk products
export async function getProducts() {
  const token = sessionStorage.getItem('session');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch('/api/products', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch products');
  }
  
  return data.data || [];
}