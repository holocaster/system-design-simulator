import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { EvaluationEntry } from "../engine/types";
import { EVALUATION_HISTORY_LIMIT } from "../engine/catalog";
import { formatEvaluationDetail, formatEvaluationSummary } from "./evaluationSummary";
import "./components.css";

interface EvaluationModalProps {
  open: boolean;
  evaluations: EvaluationEntry[];
  onClose: () => void;
}

export function EvaluationModal({ open, evaluations, onClose }: EvaluationModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) setSelectedIndex(0);
  }, [open]);

  if (!open || evaluations.length === 0) return null;

  const selected = evaluations[selectedIndex] ?? evaluations[0];
  const isFull = evaluations.length >= EVALUATION_HISTORY_LIMIT;

  return (
    <div className="save-dialog-backdrop">
      <section
        className="save-dialog evaluation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evaluation-modal-title"
      >
        <header>
          <div className="dialog-title-group">
            <p className="dialog-kicker">Histórico de rodadas</p>
            <h2 id="evaluation-modal-title">Avaliação por IA</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        </header>
        <div className="evaluation-modal-content">
          <nav className="evaluation-history" aria-label="Rodadas avaliadas">
            {isFull && (
              <p className="evaluation-history-full">
                Histórico cheio: a próxima avaliação descarta a rodada mais antiga
              </p>
            )}
            <ul>
              {evaluations.map((entry, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className={`evaluation-history-item${index === selectedIndex ? " selected" : ""}`}
                    aria-pressed={index === selectedIndex}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {formatEvaluationSummary(entry)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="evaluation-modal-selected">
            <p className="evaluation-modal-meta">{formatEvaluationDetail(selected)}</p>
            <div className="evaluation-modal-body">
              <ReactMarkdown>{selected.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
