import { describe, expect, it } from "vitest";
import { addFlow, capFlow, flowTotal, scaleFlow } from "./flow";

describe("operacoes de Flow", () => {
  it("flowTotal soma leitura e escrita", () => {
    expect(flowTotal({ read: 80, write: 20 })).toBe(100);
    expect(flowTotal({ read: 0, write: 0 })).toBe(0);
  });

  it("addFlow soma por fluxo", () => {
    expect(addFlow({ read: 10, write: 5 }, { read: 30, write: 15 })).toEqual({ read: 40, write: 20 });
    expect(addFlow({ read: 0, write: 0 }, { read: 0, write: 0 })).toEqual({ read: 0, write: 0 });
  });

  it("scaleFlow multiplica os dois fluxos", () => {
    expect(scaleFlow({ read: 80, write: 20 }, 0.5)).toEqual({ read: 40, write: 10 });
    expect(scaleFlow({ read: 80, write: 20 }, 0)).toEqual({ read: 0, write: 0 });
    expect(scaleFlow({ read: 0, write: 0 }, 3)).toEqual({ read: 0, write: 0 });
  });

  describe("capFlow", () => {
    it("teto maior que o total passa tudo", () => {
      expect(capFlow({ read: 80, write: 20 }, 200)).toEqual({ read: 80, write: 20 });
    });

    it("teto igual ao total passa tudo", () => {
      expect(capFlow({ read: 80, write: 20 }, 100)).toEqual({ read: 80, write: 20 });
    });

    it("teto menor reduz proporcionalmente", () => {
      expect(capFlow({ read: 80, write: 20 }, 50)).toEqual({ read: 40, write: 10 });
    });

    it("teto zero corta tudo", () => {
      expect(capFlow({ read: 80, write: 20 }, 0)).toEqual({ read: 0, write: 0 });
    });

    it("fluxo zero permanece zero com qualquer teto", () => {
      expect(capFlow({ read: 0, write: 0 }, 100)).toEqual({ read: 0, write: 0 });
      expect(capFlow({ read: 0, write: 0 }, 0)).toEqual({ read: 0, write: 0 });
    });
  });
});
