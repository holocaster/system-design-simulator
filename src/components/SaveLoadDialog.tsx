import { useState, type ChangeEvent } from "react";
import { isUnknownChallengeId } from "../evaluation/challenges";
import {
  deleteDesign,
  exportJson,
  importJson,
  listDesigns,
  loadDesign,
  renameDesign,
  saveDesign,
} from "../persistence/designStorage";
import { currentDesign, useAppStore } from "../store/useAppStore";
import type { Design } from "../engine/types";
import "./components.css";

const UNKNOWN_CHALLENGE_WARNING = "Desafio desconhecido, usando o padrão";

function withChallengeWarning(message: string, challengeId: string | undefined): string {
  return isUnknownChallengeId(challengeId) ? `${message}. ${UNKNOWN_CHALLENGE_WARNING}` : message;
}

export function SaveLoadDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedDesigns, setSavedDesigns] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingLoad, setPendingLoad] = useState<{ id: string; name: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<Design | null>(null);

  const completeImport = (design: Design) => {
    useAppStore.getState().importDesign(design);
    setName(design.name ?? "");
    setMessage(withChallengeWarning("Design importado", design.challengeId));
  };

  const refreshNames = () => {
    const result = listDesigns();
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setSavedDesigns(result.value);
  };

  const openDialog = () => {
    setOpen(true);
    setMessage(null);
    setName(useAppStore.getState().designName ?? "");
    refreshNames();
  };

  const completeLoad = (id: string, savedName: string) => {
    const result = loadDesign(id);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (result.value === null) {
      setMessage("Design salvo não encontrado");
      refreshNames();
      return;
    }
    useAppStore.getState().loadDesign(result.value);
    setName(savedName);
    setMessage(withChallengeWarning(`Design ${savedName} carregado`, result.value.challengeId));
  };

  const handleSave = () => {
    const state = useAppStore.getState();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setMessage("Informe um nome para salvar o design");
      return;
    }
    let result = saveDesign({ ...currentDesign(), name: trimmedName });
    if (!result.ok && result.error === "Já existe outro design com esse nome" && window.confirm("Esse nome já existe. Substituir o outro design?")) {
      result = saveDesign({ ...currentDesign(), name: trimmedName }, true);
    }
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    state.setDesignName(trimmedName);
    state.markSaved();
    setName(trimmedName);
    setMessage("Design salvo");
    refreshNames();
    if (pendingLoad) {
      completeLoad(pendingLoad.id, pendingLoad.name);
      setPendingLoad(null);
    }
    if (pendingImport) {
      completeImport(pendingImport);
      setPendingImport(null);
    }
  };

  const handleLoad = (id: string, savedName: string) => {
    if (useAppStore.getState().hasUnsavedChanges()) {
      setPendingLoad({ id, name: savedName });
      return;
    }
    completeLoad(id, savedName);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const result = deleteDesign(deleteTarget.id);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (deleteTarget.id === useAppStore.getState().designId) useAppStore.getState().markUnpersisted();
    setMessage(`Design ${deleteTarget.name} excluído`);
    setDeleteTarget(null);
    refreshNames();
  };

  const handleRename = () => {
    if (!renameTarget) return;
    const activeId = useAppStore.getState().designId;
    if (renameTarget.id !== activeId && savedDesigns.some((item) => item.id === activeId && item.name.toLocaleLowerCase() === renameTarget.name.trim().toLocaleLowerCase())) {
      setMessage("Renomeie primeiro o design aberto");
      return;
    }
    let result = renameDesign(renameTarget.id, renameTarget.name);
    if (!result.ok && result.error === "Já existe outro design com esse nome" && window.confirm("Esse nome já existe. Substituir o outro design?")) {
      result = renameDesign(renameTarget.id, renameTarget.name, true);
    }
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (renameTarget.id === activeId) {
      useAppStore.getState().renameActiveDesign(renameTarget.name.trim());
      setName(renameTarget.name.trim());
    }
    setRenameTarget(null);
    refreshNames();
  };

  const handleExport = () => {
    const blob = new Blob([exportJson(currentDesign())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${useAppStore.getState().designName ?? "design-sem-titulo"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Design exportado");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = importJson(await file.text());
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (useAppStore.getState().hasUnsavedChanges()) {
        setPendingImport(result.value);
        return;
      }
      completeImport(result.value);
    } catch {
      setMessage("Não foi possível ler o arquivo selecionado");
    }
  };

  return (
    <>
      <button className="designs-button" type="button" onClick={openDialog}>
        Gerenciar designs
      </button>
      {open && (
        <div className="save-dialog-backdrop">
          <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
            <header>
              <div className="dialog-title-group">
                <p className="dialog-kicker">Persistência local</p>
                <h2 id="save-title">Gerenciar designs</h2>
              </div>
              <button className="dialog-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                Fechar
              </button>
            </header>

            <div className="save-row">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome do design"
                aria-label="Nome do design"
              />
              <button className="dialog-primary" type="button" onClick={handleSave}>Salvar</button>
            </div>

            <div className="file-actions">
              <button type="button" onClick={handleExport}>Exportar JSON</button>
              <label>
                Importar JSON
                <input type="file" accept="application/json,.json" onChange={handleImport} />
              </label>
            </div>

            <h3>Designs salvos</h3>
            {savedDesigns.length === 0 ? (
              <p className="saved-empty">Nenhum design salvo</p>
            ) : (
              <ul className="saved-list">
                {savedDesigns.map((savedDesign) => (
                  <li key={savedDesign.id}>
                    <span>{savedDesign.name}</span>
                    {savedDesign.id === useAppStore.getState().designId && <span>Aberto</span>}
                    <button type="button" onClick={() => handleLoad(savedDesign.id, savedDesign.name)}>Carregar</button>
                    <button type="button" onClick={() => setRenameTarget(savedDesign)}>Renomear</button>
                    <button className="dialog-danger" type="button" onClick={() => setDeleteTarget(savedDesign)}>Excluir</button>
                  </li>
                ))}
              </ul>
            )}
            {message && <p className="save-message" aria-live="polite">{message}</p>}
            {renameTarget && (
              <section role="dialog" aria-modal="true" aria-label="Renomear design">
                <div className="save-row">
                  <input aria-label="Novo nome do design" value={renameTarget.name} onChange={(event) => setRenameTarget({ ...renameTarget, name: event.target.value })} />
                </div>
                <div className="dialog-actions">
                  <button type="button" onClick={handleRename}>Confirmar renomeação</button>
                  <button type="button" onClick={() => setRenameTarget(null)}>Cancelar</button>
                </div>
              </section>
            )}
            {deleteTarget && (
              <section role="dialog" aria-modal="true" aria-label="Excluir design">
                <p>Excluir “{deleteTarget.name}” do armazenamento local?</p>
                <div className="dialog-actions">
                  <button className="dialog-danger" type="button" onClick={handleDelete}>Excluir</button>
                  <button type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                </div>
              </section>
            )}
            {pendingLoad && (
              <section role="dialog" aria-modal="true" aria-label="Alterações não salvas">
                <p>Salve ou descarte as alterações antes de carregar outro design.</p>
                <div className="dialog-actions">
                  <button type="button" onClick={handleSave}>Salvar e continuar</button>
                  <button type="button" onClick={() => {
                    completeLoad(pendingLoad.id, pendingLoad.name);
                    setPendingLoad(null);
                  }}>Descartar alterações</button>
                  <button type="button" onClick={() => setPendingLoad(null)}>Cancelar</button>
                </div>
              </section>
            )}
            {pendingImport && (
              <section role="dialog" aria-modal="true" aria-label="Alterações não salvas">
                <p>Salve ou descarte as alterações antes de importar outro design.</p>
                <div className="dialog-actions">
                  <button type="button" onClick={handleSave}>Salvar e continuar</button>
                  <button type="button" onClick={() => {
                    completeImport(pendingImport);
                    setPendingImport(null);
                  }}>Descartar alterações</button>
                  <button type="button" onClick={() => setPendingImport(null)}>Cancelar</button>
                </div>
              </section>
            )}
          </section>
        </div>
      )}
    </>
  );
}
