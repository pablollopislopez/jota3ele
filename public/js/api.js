const API = '/api';

export async function fetchArtworks() {
  const res = await fetch(`${API}/artworks`);
  if (!res.ok) throw new Error('Error al cargar obras');
  return res.json();
}

export async function login(password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error de autenticación');
  }
  return res.json();
}

export async function uploadArtwork(formData, token) {
  const res = await fetch(`${API}/artworks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al subir obra');
  }
  return res.json();
}

export async function deleteArtwork(id, token) {
  const res = await fetch(`${API}/artworks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al eliminar obra');
  return res.json();
}

export function getToken() {
  return localStorage.getItem('atelier_token');
}

export function setToken(token) {
  localStorage.setItem('atelier_token', token);
}

export function clearToken() {
  localStorage.removeItem('atelier_token');
}
