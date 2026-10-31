const HELP_SEEN_STORAGE_KEY = "help-seen";

function getStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage;
}

export function hasSeenHelp(storage?: Storage): boolean {
  return getStorage(storage).getItem(HELP_SEEN_STORAGE_KEY) === "true";
}

export function markHelpSeen(storage?: Storage): void {
  try {
    getStorage(storage).setItem(HELP_SEEN_STORAGE_KEY, "true");
  } catch {
    // Preferência de exibição, não conteúdo do design: uma falha de quota não deve derrubar a inicialização.
  }
}
