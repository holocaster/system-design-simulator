import { describe, expect, it } from "vitest";
import { hasSeenHelp, markHelpSeen } from "./help";

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

describe("help", () => {
  it("retorna não visto quando não há valor salvo", () => {
    expect(hasSeenHelp(new MemoryStorage())).toBe(false);
  });

  it("retorna visto depois de markHelpSeen", () => {
    const storage = new MemoryStorage();
    markHelpSeen(storage);
    expect(hasSeenHelp(storage)).toBe(true);
  });

  it("markHelpSeen não lança quando o armazenamento falha ao gravar", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(() => markHelpSeen(storage)).not.toThrow();
  });
});
