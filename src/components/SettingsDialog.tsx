import { useEffect, useState } from "react";
import {
  CUSTOM_MODEL_ID,
  DEFAULT_OPENROUTER_MODEL,
  MODEL_PRESETS,
  getOpenRouterApiKey,
  getOpenRouterModel,
  saveOpenRouterSettings,
} from "../evaluation/apiKey";
import "./components.css";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setApiKey(getOpenRouterApiKey() ?? "");
    setModel(getOpenRouterModel());
    setMessage(null);
  }, [open]);

  if (!open) return null;

  const isCustomModel = !MODEL_PRESETS.some((preset) => preset.model === model);
  const selectValue = isCustomModel ? CUSTOM_MODEL_ID : model;

  const handleModelSelect = (value: string) => {
    setModel(value === CUSTOM_MODEL_ID ? "" : value);
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();
    if (trimmedKey === "") {
      setMessage("Informe uma chave da API OpenRouter");
      return;
    }
    if (trimmedModel === "") {
      setMessage("Informe um modelo OpenRouter");
      return;
    }
    saveOpenRouterSettings(trimmedKey, trimmedModel);
    setMessage("Configuração salva neste navegador");
  };

  return (
    <div className="save-dialog-backdrop">
      <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div className="dialog-title-group">
            <p className="dialog-kicker">OpenRouter</p>
            <h2 id="settings-title">Configuração da API</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        </header>

        <p className="dialog-intro">
          A chave OpenRouter e o modelo serão armazenados somente no localStorage deste
          navegador. Use apenas em um dispositivo confiável.
        </p>
        <div className="settings-fields">
          <label htmlFor="openrouter-api-key">Chave da API OpenRouter</label>
          <input
            id="openrouter-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-or-v1-..."
            autoComplete="off"
          />
          <label htmlFor="openrouter-model">Modelo OpenRouter</label>
          <select
            id="openrouter-model"
            value={selectValue}
            onChange={(event) => handleModelSelect(event.target.value)}
          >
            {MODEL_PRESETS.map((preset) => (
              <option key={preset.model} value={preset.model}>
                {preset.label}
              </option>
            ))}
            <option value={CUSTOM_MODEL_ID}>Personalizado</option>
          </select>
          {isCustomModel && (
            <input
              id="openrouter-model-custom"
              aria-label="Modelo OpenRouter personalizado"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="provider/model"
              autoComplete="off"
            />
          )}
          <button className="dialog-primary" type="button" onClick={handleSave}>
            Salvar
          </button>
        </div>
        {message && <p className="save-message" aria-live="polite">{message}</p>}
      </section>
    </div>
  );
}
