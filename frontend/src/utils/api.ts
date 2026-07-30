export function apiFetch(url: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}
