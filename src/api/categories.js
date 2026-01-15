// FRONTEND ONLY - hanya fetch API

export async function getCategories() {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('session');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_URL}/api/categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch categories');
  }
  
  return data.data || [];
}

export async function createCategory(name, description = '') {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('session');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create category');
  }
  
  return data.data;
}

export async function updateCategory(id, updates) {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('session');
  
  const response = await fetch(`${API_URL}/api/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update category');
  }
  
  return data.data;
}

export async function deleteCategory(id) {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = sessionStorage.getItem('session');
  
  const response = await fetch(`${API_URL}/api/categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete category');
  }
  
  return true;
}