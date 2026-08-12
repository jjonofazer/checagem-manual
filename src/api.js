const TOKEN_KEY = 'checagemManualToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Erro inesperado ao falar com o servidor');
  }

  return data;
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function getSections() {
  return request('/sections');
}

export function createSection(title) {
  return request('/sections', { method: 'POST', body: JSON.stringify({ title }) });
}

export function updateSection(id, title) {
  return request(`/sections/${id}`, { method: 'PUT', body: JSON.stringify({ title }) });
}

export function deleteSection(id) {
  return request(`/sections/${id}`, { method: 'DELETE' });
}

export function moveSection(id, direction) {
  return request(`/sections/${id}/move`, { method: 'POST', body: JSON.stringify({ direction }) });
}

export function createItem({ sectionId, parentId, label, instructions }) {
  return request('/items', {
    method: 'POST',
    body: JSON.stringify({ sectionId, parentId, label, instructions })
  });
}

export function updateItem(id, { label, instructions }) {
  return request(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ label, instructions })
  });
}

export function deleteItem(id) {
  return request(`/items/${id}`, { method: 'DELETE' });
}

export function moveItem(id, direction) {
  return request(`/items/${id}/move`, { method: 'POST', body: JSON.stringify({ direction }) });
}

export function getRegistros(date) {
  return request(`/registros?date=${date}`);
}

export function createRegistro({ itemId, date, status, obs }) {
  return request('/registros', {
    method: 'POST',
    body: JSON.stringify({ itemId, date, status, obs })
  });
}

export function deleteRegistro(itemId, date) {
  return request(`/registros/${itemId}?date=${date}`, { method: 'DELETE' });
}

export function resetRegistros(date) {
  return request(`/registros?date=${date}`, { method: 'DELETE' });
}

export function getDailyStats(days = 7) {
  return request(`/stats/daily?days=${days}`);
}

export function listUsers() {
  return request('/users');
}

export function createUser({ username, name, password, role }) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify({ username, name, password, role })
  });
}

export function updateUser(id, { username, name, password, role }) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ username, name, password, role })
  });
}
