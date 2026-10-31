export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

function getStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage;
}

export function getTheme(storage?: Storage): Theme {
  return getStorage(storage).getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function saveTheme(theme: Theme, storage?: Storage): void {
  try {
    getStorage(storage).setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preferência de exibição, não conteúdo do design: uma falha de quota não deve derrubar o clique do usuário.
  }
}

export function toggleTheme(storage?: Storage): Theme {
  const s = getStorage(storage);
  const next: Theme = getTheme(s) === "dark" ? "light" : "dark";
  saveTheme(next, s);
  return next;
}

export function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}
