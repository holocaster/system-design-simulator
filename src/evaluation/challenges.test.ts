import { describe, expect, it } from "vitest";
import { CHALLENGES, CUSTOM_CHALLENGE_ID, isUnknownChallengeId } from "./challenges";

describe("isUnknownChallengeId", () => {
  it("nao acusa design legado, que nao tem challengeId", () => {
    expect(isUnknownChallengeId(undefined)).toBe(false);
  });

  it("nao acusa o desafio personalizado", () => {
    expect(isUnknownChallengeId(CUSTOM_CHALLENGE_ID)).toBe(false);
  });

  it("nao acusa nenhum preset existente", () => {
    for (const challenge of CHALLENGES) {
      expect(isUnknownChallengeId(challenge.id)).toBe(false);
    }
  });

  it("acusa id que nao existe na lista", () => {
    expect(isUnknownChallengeId("preset-que-nao-existe")).toBe(true);
  });

  it("acusa string vazia, que nao corresponde a nenhum preset", () => {
    expect(isUnknownChallengeId("")).toBe(true);
  });
});
