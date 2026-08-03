const THEME_KEY = 'di-theme';

export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
  return 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* noop */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
