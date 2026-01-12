// Frontend API calls for users management

export async function getUsers() {
  const token = sessionStorage.getItem('session');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch('/api/admin/users', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch users');
  }
  
  return data.data || [];
}

export async function getUserDetails(userId) {
  const token = localStorage.getItem('session');
  
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user details');
  }
  
  return data.data;
}