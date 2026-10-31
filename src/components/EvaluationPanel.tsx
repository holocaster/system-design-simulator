import { lazy, Suspense, useState } from "react";
import { getOpenRouterApiKey, getOpenRouterModel } from "../evaluation/apiKey";
import { BRIEF_MAX_LENGTH, CHALLENGES, CUSTOM_CHALLENGE_ID } from "../evaluation/challenges";
import { evaluateDesign } from "../evaluation/openRouter";
import { currentDesign, useAppStore } from "../store/useAppStore";
import "./components.css";

// react-markdown so entra no bundle quando o modal e de fato aberto pela
// primeira vez: nao e necessario para o primeiro paint, e o LCP da pagina e
// texto renderizado pelo React (sem SSR), entao bundle inicial menor ajuda.
const EvaluationModal = lazy(() =>
  import("./EvaluationModal").then((module) => ({ default: module.EvaluationModal })),
);

const BRIEF_PLACEHOLDER =
  "Ex: Sistema de reserva de hotéis. 5.000 buscas/s e 200 reservas/s no pico. " +
  "Busca pode ficar levemente desatualizada, mas reserva não pode gerar overbooking.";

interface EvaluationPanelProps {
  onOpenSettings: () => void;
}

export function EvaluationPanel({ onOpenSettings }: EvaluationPanelProps) {
  const simState = useAppStore((state) => state.simState);
  const rps = useAppStore((state) => state.rps);
  const writePercent = useAppStore((state) => state.writePercent);
  const brief = useAppStore((state) => state.brief);
  const challengeId = useAppStore((state) => state.challengeId);
  const setBrief = useAppStore((state) => state.setBrief);
  const setChallengeId = useAppStore((state) => state.setChallengeId);
  const evaluations = useAppStore((state) => state.evaluations);
  const addEvaluation = useAppStore((state) => state.addEvaluation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const latest = evaluations[0];

  const isCustom = challengeId === CUSTOM_CHALLENGE_ID;
  const selectedPreset = CHALLENGES.find((item) => item.id === challengeId);
  const selectValue = isCustom ? CUSTOM_CHALLENGE_ID : (selectedPreset?.id ?? CHALLENGES[0].id);
  const resolvedBrief = isCustom ? brief : (selectedPreset?.brief ?? CHALLENGES[0].brief);
  const briefMissing = isCustom && brief.trim().length === 0;

  const handleEvaluate = async () => {
    if (!getOpenRouterApiKey()) {
      onOpenSettings();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await evaluateDesign(currentDesign(), simState, resolvedBrief, {
        rps,
        writePercent,
      });
      addEvaluation(text, getOpenRouterModel(), simState?.global);
      setModalOpen(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível avaliar o design",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="evaluation-panel">
        <header className="panel-section-header">
          <p className="panel-section-kicker">Análise do sistema</p>
          <h2>Avaliação por IA</h2>
        </header>
        <div className="evaluation-field">
          <label htmlFor="evaluation-challenge">Desafio</label>
          <select
            id="evaluation-challenge"
            value={selectValue}
            onChange={(event) => setChallengeId(event.target.value)}
            disabled={loading}
          >
            {CHALLENGES.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.name}
              </option>
            ))}
            <option value={CUSTOM_CHALLENGE_ID}>Personalizado</option>
          </select>
        </div>
        {isCustom && (
          <div className="evaluation-field">
            <label htmlFor="evaluation-brief">Descreva o sistema</label>
            <textarea
              id="evaluation-brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              maxLength={BRIEF_MAX_LENGTH}
              rows={6}
              disabled={loading}
              placeholder={BRIEF_PLACEHOLDER}
              aria-invalid={briefMissing}
              aria-describedby={briefMissing ? "evaluation-brief-error" : undefined}
            />
            {briefMissing && (
              <p id="evaluation-brief-error" className="evaluation-error" role="alert">
                Descreva o sistema para iniciar a avaliação.
              </p>
            )}
          </div>
        )}
        <div className="evaluation-actions">
          <button type="button" className="evaluation-submit" onClick={handleEvaluate} disabled={loading || briefMissing}>
            {loading ? "Avaliando..." : "Avaliar design"}
          </button>
          {latest && !loading && (
            <button type="button" className="evaluation-view" onClick={() => setModalOpen(true)}>
              Ver avaliações
            </button>
          )}
        </div>
        {error && <p className="evaluation-error" role="alert">{error}</p>}
      </section>
      {modalOpen && evaluations.length > 0 && (
        <Suspense fallback={null}>
          <EvaluationModal
            open={modalOpen}
            evaluations={evaluations}
            onClose={() => setModalOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
