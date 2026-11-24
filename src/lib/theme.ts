/**
 * Theme switch (ADR 0009). Light is the default; the viewer's choice is kept
 * in localStorage under `theme`. index.html runs the same read inline before
 * the first paint, so keep the key and the default in sync with it.
 */
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'theme'

/** The stored theme, or light when nothing valid is stored or storage is blocked. */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Sets `.dark` on <html> to match `theme` and stores the choice when storage allows. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage blocked (private mode, policy). The class still switches.
  }
}
