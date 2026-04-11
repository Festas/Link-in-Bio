/**
 * API client for communicating with the FastAPI backend.
 * All endpoints match the existing router structure.
 */

const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Settings ──
export const getSettings = () => request(`${API_BASE}/settings`);
export const updateSettings = (data) =>
  request(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) });

// ── Items (blocks) ──
export const getItems = (pageId) => {
  const params = pageId != null ? `?page_id=${pageId}` : '';
  return request(`${API_BASE}/items${params}`);
};

export const createItem = (type, data) =>
  request(`${API_BASE}/items/${type}`, { method: 'POST', body: JSON.stringify(data) });

export const updateItem = (id, data) =>
  request(`${API_BASE}/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteItem = (id) =>
  request(`${API_BASE}/items/${id}`, { method: 'DELETE' });

export const toggleItemVisibility = (id) =>
  request(`${API_BASE}/items/${id}/toggle_visibility`, { method: 'PUT' });

export const reorderItems = (ids) =>
  request(`${API_BASE}/items/reorder`, { method: 'POST', body: JSON.stringify({ order: ids }) });

// ── Pages ──
export const getPages = () => request(`${API_BASE}/pages`);
export const createPage = (data) =>
  request(`${API_BASE}/pages`, { method: 'POST', body: JSON.stringify(data) });
export const updatePage = (id, data) =>
  request(`${API_BASE}/pages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePage = (id) =>
  request(`${API_BASE}/pages/${id}`, { method: 'DELETE' });

// ── Analytics ──
export const getAnalytics = () => request(`${API_BASE}/analytics`);
export const getPageviewCount = () => request(`${API_BASE}/pageviews/count`);

// ── Media ──
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

// ── Subscribers ──
export const getSubscribers = () => request(`${API_BASE}/subscribers`);
export const deleteSubscriber = (id) =>
  request(`${API_BASE}/subscribers/${id}`, { method: 'DELETE' });
export const exportSubscribers = () =>
  request(`${API_BASE}/subscribers/export`);

// ── Auth ──
export const checkAuth = async () => {
  try {
    await request(`${API_BASE}/settings`);
    return true;
  } catch {
    return false;
  }
};

export const logout = () =>
  request('/api/logout', { method: 'POST' }).catch(() => {
    window.location.href = '/login';
  });
