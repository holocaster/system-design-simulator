import { describe, expect, it } from "vitest";
import { getTheme, saveTheme, toggleTheme } from "./theme";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("theme", () => {
  it("retorna escuro quando não há preferência salva", () => {
    expect(getTheme(new MemoryStorage())).toBe("dark");
  });

  it("retorna o tema salvo depois de saveTheme", () => {
    const storage = new MemoryStorage();
    saveTheme("light", storage);
    expect(getTheme(storage)).toBe("light");
  });

  it("toggleTheme alterna de escuro (default) para claro e persiste", () => {
    const storage = new MemoryStorage();
    const next = toggleTheme(storage);
    expect(next).toBe("light");
    expect(getTheme(storage)).toBe("light");
  });

  it("toggleTheme alterna de claro para escuro e persiste", () => {
    const storage = new MemoryStorage();
    saveTheme("light", storage);
    const next = toggleTheme(storage);
    expect(next).toBe("dark");
    expect(getTheme(storage)).toBe("dark");
  });

  it("toggleTheme não lança quando o armazenamento falha ao gravar", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(() => toggleTheme(storage)).not.toThrow();
  });
});
