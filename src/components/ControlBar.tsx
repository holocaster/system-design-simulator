import { useEffect, useState } from "react";
import { hasSeenHelp, markHelpSeen } from "../help/help";
import { saveDesign } from "../persistence/designStorage";
import { currentDesign, useAppStore } from "../store/useAppStore";
import { applyTheme, getTheme, toggleTheme } from "../theme/theme";
import { HelpModal } from "./HelpModal";
import "./components.css";

const MIN_EXPONENT = 0;
const MAX_EXPONENT = 5;

const SUCCESS_HEALTHY_THRESHOLD = 0.99;
const SUCCESS_DEGRADED_THRESHOLD = 0.7;

function successHealthClass(successRatio: number | undefined): string | null {
  if (successRatio === undefined) return null;
  if (successRatio >= SUCCESS_HEALTHY_THRESHOLD) return "global-metrics-value-ok";
  if (successRatio >= SUCCESS_DEGRADED_THRESHOLD) return "global-metrics-value-warn";
  return "global-metrics-value-bad";
}

export function ControlBar() {
  const designName = useAppStore((state) => state.designName);
  const hasUnsavedChanges = useAppStore((state) => state.hasUnsavedChanges());
  const rps = useAppStore((state) => state.rps);
  const [rpsDraft, setRpsDraft] = useState(String(rps));
  const [newConfirmOpen, setNewConfirmOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [theme, setTheme] = useState(() => getTheme());
  const [helpOpen, setHelpOpen] = useState(false);
  const writePercent = useAppStore((state) => state.writePercent);
  const running = useAppStore((state) => state.running);
  const globalMetrics = useAppStore((state) => state.simState?.global);

  const handleSaveClick = () => {
    const state = useAppStore.getState();
    if (!state.designName) {
      document.querySelector<HTMLButtonElement>(".designs-button")?.click();
      return;
    }
    const result = saveDesign({ ...currentDesign(), name: state.designName });
    if (!result.ok) {
      state.setStatusMessage(result.error);
      return;
    }
    state.markSaved();
  };

  const createNew = () => {
    if (hasUnsavedChanges) {
      setNewConfirmOpen(true);
      return;
    }
    useAppStore.getState().createNewDesign();
  };

  const saveAndCreateNew = () => {
    const state = useAppStore.getState();
    const name = (state.designName ?? saveName).trim();
    let result = saveDesign({ ...currentDesign(), name });
    if (!result.ok && result.error === "Já existe outro design com esse nome" && window.confirm("Esse nome já existe. Substituir o outro design?")) {
      result = saveDesign({ ...currentDesign(), name }, true);
    }
    if (!result.ok) return;
    state.setDesignName(name);
    state.markSaved();
    state.createNewDesign();
    setNewConfirmOpen(false);
  };

  const toggleSimulation = () => {
    const state = useAppStore.getState();
    if (state.running) {
      state.stopSim();
      state.setStatusMessage(null);
      return;
    }

    const error = state.startSim();
    state.setStatusMessage(error);
  };

  useEffect(() => {
    setRpsDraft(String(rps));
  }, [rps]);

  useEffect(() => {
    if (hasSeenHelp()) return;
    setHelpOpen(true);
    markHelpSeen();
  }, []);

  const changeRps = (value: string) => {
    useAppStore.getState().setRps(Math.round(10 ** Number(value)));
  };

  const commitRpsDraft = () => {
    const parsed = Number(rpsDraft);
    if (!Number.isFinite(parsed) || rpsDraft.trim() === "") {
      setRpsDraft(String(rps));
      return;
    }
    useAppStore.getState().setRps(Math.round(parsed));
    setRpsDraft(String(useAppStore.getState().rps));
  };

  const healthClass = successHealthClass(globalMetrics?.successRatio);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    applyTheme(next);
    setTheme(next);
  };

  return (
    <section className="control-bar" aria-label="Controles da simulação">
      <div className="design-controls" aria-label="Design">
        <span>{designName ?? "Sem título"}</span>
        <span aria-live="polite">{designName && !hasUnsavedChanges ? "Salvo" : "Alterações não salvas"}</span>
        <button type="button" onClick={handleSaveClick} disabled={Boolean(designName) && !hasUnsavedChanges}>Salvar</button>
        <button type="button" onClick={createNew}>Novo design</button>
      </div>
      <button type="button" onClick={toggleSimulation}>
        {running ? "Parar" : "Iniciar"}
      </button>
      <label className="rps-control">
        <span className="control-bar-field-label">Carga (RPS)</span>
        <span className="rps-control-group">
          <input
            type="range"
            min={MIN_EXPONENT}
            max={MAX_EXPONENT}
            step="0.01"
            value={Math.log10(rps)}
            onChange={(event) => changeRps(event.target.value)}
            aria-label="Carga em RPS (deslizante)"
          />
          <input
            className="rps-input"
            type="number"
            min="1"
            max="100000"
            step="1"
            value={rpsDraft}
            onChange={(event) => setRpsDraft(event.target.value)}
            onBlur={commitRpsDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label="Carga em RPS"
          />
        </span>
      </label>
      <label className="write-control">
        <span className="control-bar-field-label">Escritas (%)</span>
        <input
          className="write-input"
          type="number"
          min="0"
          max="100"
          step="1"
          value={writePercent}
          onChange={(event) => useAppStore.getState().setWritePercent(Number(event.target.value))}
        />
      </label>
      <div className="global-metrics" aria-live="polite">
        <div className="global-metrics-tile">
          <span className="global-metrics-label">Sucesso</span>
          <span className={["global-metrics-value", healthClass].filter(Boolean).join(" ")}>
            {((globalMetrics?.successRatio ?? 0) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="global-metrics-tile">
          <span className="global-metrics-label">Latência</span>
          <span className="global-metrics-value">{Math.round(globalMetrics?.e2eLatencyMs ?? 0)} ms</span>
        </div>
        <div className="global-metrics-tile">
          <span className="global-metrics-label">Total</span>
          <span className="global-metrics-value">
            {Math.round(globalMetrics?.totalRps ?? 0).toLocaleString("pt-BR")} RPS
          </span>
        </div>
      </div>
      <button type="button" onClick={() => setHelpOpen(true)} aria-label="Ajuda">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2" />
          <line x1="12" y1="17" x2="12" y2="17.01" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleToggleTheme}
        aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
      >
        {theme === "dark" ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4 4.2 19.8M19.8 4.2l-1.4 1.4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          </svg>
        )}
      </button>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {newConfirmOpen && (
        <div className="save-dialog-backdrop">
          <section className="save-dialog" role="dialog" aria-modal="true" aria-label="Alterações não salvas">
            <h2>Alterações não salvas</h2>
            <p>Salve ou descarte as alterações antes de criar um novo design.</p>
            {!designName && (
              <div className="save-row">
                <input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="Nome do design" aria-label="Nome do design" />
              </div>
            )}
            <div className="dialog-actions">
              <button type="button" onClick={saveAndCreateNew}>Salvar e continuar</button>
              <button type="button" onClick={() => { useAppStore.getState().createNewDesign(); setNewConfirmOpen(false); }}>Descartar alterações</button>
              <button type="button" onClick={() => setNewConfirmOpen(false)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
