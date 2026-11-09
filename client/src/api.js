const TOKEN_KEY = 'dbp_token';
const USER_KEY = 'dbp_user';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable: the user will simply sign in again next time */
  }
};

export const getToken = () => read(TOKEN_KEY);
export const getUser = () => read(USER_KEY) || 'Coach';

export function logout() {
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
}

async function request(method, url, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 401 && auth) {
    logout();
    window.dispatchEvent(new Event('auth-expired'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed. Check that the server is running.');
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};

export async function login(username, password) {
  const data = await request('POST', '/api/login', { username, password }, { auth: false });
  write(TOKEN_KEY, data.token);
  write(USER_KEY, data.username);
  return data.username;
}

export const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
