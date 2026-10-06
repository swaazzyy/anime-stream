const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('anime_token');
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  const data = await res.json().catch(() => ({})); // plain-text errors (e.g. "404 page not found") aren't JSON
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

const post = (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) });

async function authenticate(endpoint, body) {
  const data = await post(endpoint, body);
  localStorage.setItem('anime_token', data.token);
  localStorage.setItem('anime_user', JSON.stringify(data.user));
  return data;
}

export const api = {
  // Auth
  login: (username, password) => authenticate('/auth/login', { username, password }),
  register: (username, email, password) => authenticate('/auth/register', { username, email, password }),

  logout() {
    localStorage.removeItem('anime_token');
    localStorage.removeItem('anime_user');
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('anime_user'));
    } catch {
      return null; // corrupt entry: treat as logged out instead of crashing the app on load
    }
  },

  me: () => request('/auth/me'),

  async updateProfile(profileData) {
    const data = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (data.token) localStorage.setItem('anime_token', data.token);
    if (data.user) localStorage.setItem('anime_user', JSON.stringify(data.user));
    return data;
  },

  updatePassword(passwordData) {
    return request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },

  // Catalog & Search
  getCatalog: () => request('/anime/catalog'),
  searchAnime: (query, filters = {}) => request(`/anime/search?${new URLSearchParams({ q: query, ...filters })}`),
  getAnime: (id) => request(`/anime/${encodeURIComponent(id)}`),
  getEpisode: (animeId, episodeNum) => request(`/anime/${encodeURIComponent(animeId)}/episode/${episodeNum}`),

  // Watch History ("Still viewing")
  getContinueWatching: () => request('/history'),
  saveWatchProgress: (progressData) => post('/history', progressData),
  deleteWatchHistory: (animeId, episodeNum) =>
    request(`/history?anime_id=${encodeURIComponent(animeId)}&episode=${episodeNum}`, { method: 'DELETE' }),

  // Watchlist ("For the future")
  getWatchlist: () => request('/watchlist'),
  setWatchlistItem: (itemData) => post('/watchlist', itemData),
  removeFromWatchlist: (animeId) => request(`/watchlist?anime_id=${encodeURIComponent(animeId)}`, { method: 'DELETE' }),

  // Favorites
  getFavorites: () => request('/favorites'),
  toggleFavorite: (animeId, animeTitle, animePoster) =>
    post('/favorites', { anime_id: animeId, anime_title: animeTitle, anime_poster: animePoster }),

  // Torrents & Downloads
  getTorrents: () => request('/torrents'),
  addDownload: (downloadData) => post('/torrents', downloadData),
  pauseTorrent: (id) => request(`/torrents/${encodeURIComponent(id)}/pause`, { method: 'POST' }),
  resumeTorrent: (id) => request(`/torrents/${encodeURIComponent(id)}/resume`, { method: 'POST' }),
  deleteTorrent: (id, deleteFile = false) => request(`/torrents/${encodeURIComponent(id)}?delete_file=${deleteFile}`, { method: 'DELETE' }),

  // VPN & Gluetun Status
  getVpnStatus: () => request('/vpn/status'),
};
