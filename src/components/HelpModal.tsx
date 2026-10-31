import type { HealthState } from "../engine/types";
import "./components.css";
import { STATE_COLORS } from "./healthColors";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const HEALTH_LABELS: Record<HealthState, string> = {
  healthy: "Saudável",
  degraded: "Degradado",
  overloaded: "Sobrecarregado",
  down: "Inativo",
};

const HEALTH_LEGEND: HealthState[] = ["healthy", "degraded", "overloaded", "down"];

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div className="save-dialog-backdrop">
      <section className="save-dialog help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
        <header>
          <div className="dialog-title-group">
            <p className="dialog-kicker">Como usar</p>
            <h2 id="help-modal-title">Ajuda</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        </header>
        <div className="help-modal-body">
          <section>
            <h3>Montando e simulando um design</h3>
            <p>
              Arraste um componente da paleta à esquerda para o canvas. Conecte
              componentes clicando e arrastando de um ponto de conexão a outro.
              Ajuste a carga (RPS) e o percentual de escritas na barra de
              controle, depois clique em &quot;Iniciar&quot; para rodar a
              simulação.
            </p>
          </section>
          <section>
            <h3>Cores de saúde</h3>
            <ul className="help-health-legend">
              {HEALTH_LEGEND.map((state) => (
                <li key={state}>
                  <span
                    className="help-health-swatch"
                    style={{ background: STATE_COLORS[state] }}
                    aria-hidden="true"
                  />
                  {HEALTH_LABELS[state]}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Avaliação por IA</h3>
            <p>
              Em &quot;Configurar API&quot;, informe uma chave e um modelo da
              OpenRouter para receber uma avaliação da sua arquitetura. A chave
              fica só no armazenamento deste navegador.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
