import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "./App.css";
import { Canvas } from "./components/Canvas";
import { ControlBar } from "./components/ControlBar";
import { EvaluationPanel } from "./components/EvaluationPanel";
import { Palette } from "./components/Palette";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { SaveLoadDialog } from "./components/SaveLoadDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { useSimulation } from "./hooks/useSimulation";
import { useAppStore } from "./store/useAppStore";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasUnsavedChanges = useAppStore((state) => state.hasUnsavedChanges());
  useSimulation();

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-header-title">Simulador de System Design</h1>
          <a className="app-header-guide-link" href="/system-design/">
            O que é System Design?
          </a>
        </header>
        <div className="app">
          <aside className="sidebar">
            <h2>Componentes</h2>
            <Palette />
            <SaveLoadDialog />
            <button className="designs-button" type="button" onClick={() => setSettingsOpen(true)}>
              Configurar API
            </button>
          </aside>
          <main className="canvas">
            <ControlBar />
            <Canvas />
          </main>
          <aside className="panel">
            <section className="panel-section properties-section">
              <header className="panel-section-header">
                <p className="panel-section-kicker">Componente selecionado</p>
                <h2>Propriedades</h2>
              </header>
              <PropertiesPanel />
            </section>
            <EvaluationPanel onOpenSettings={() => setSettingsOpen(true)} />
          </aside>
          <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
