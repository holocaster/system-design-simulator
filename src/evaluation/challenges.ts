export const CUSTOM_CHALLENGE_ID = "custom";
export const BRIEF_MAX_LENGTH = 2000;

export interface EvaluationChallenge {
  id: string;
  name: string;
  brief: string;
}

export function isUnknownChallengeId(challengeId: string | undefined): boolean {
  if (challengeId === undefined || challengeId === CUSTOM_CHALLENGE_ID) return false;
  return !CHALLENGES.some((challenge) => challenge.id === challengeId);
}

export const CHALLENGES: readonly EvaluationChallenge[] = [
  {
    id: "url-shortener",
    name: "URL shortener",
    brief: "Encurtador de URLs. Suportar 10.000 RPS.",
  },
  {
    id: "news-feed",
    name: "Feed de notícias",
    brief: "Feed de notícias social. Suportar 50.000 leituras por segundo.",
  },
];
