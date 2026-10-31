import { useState } from "react";
import {
  AUTOSCALING_LIMITS,
  COMPONENT_META,
  DEFAULT_AUTOSCALING,
  DEFAULT_PARAMS,
  PARAM_LIMITS,
  REPLICABLE_TYPES,
  findTechPreset,
  techPresetsFor,
} from "../engine/catalog";
import type { AutoscalingConfig, ComponentParams, ComponentType } from "../engine/types";
import { useAppStore, type AppNode } from "../store/useAppStore";
import "./components.css";

type ScalarParamKey = Exclude<keyof ComponentParams, "autoscaling">;

interface Field {
  key: ScalarParamKey;
  label: string;
  min: number;
  max: number;
  scale: number;
}

const BASE_FIELDS: Field[] = [
  { key: "capacity", label: "Capacidade (RPS)", min: PARAM_LIMITS.capacity.min, max: PARAM_LIMITS.capacity.max, scale: 1 },
  { key: "baseLatencyMs", label: "Latência base (ms)", min: PARAM_LIMITS.baseLatencyMs.min, max: PARAM_LIMITS.baseLatencyMs.max, scale: 1 },
  { key: "errorRate", label: "Taxa de erro (%)", min: 0, max: 100, scale: 100 },
];

const HIT_RATIO_FIELD: Field = { key: "hitRatio", label: "Hit ratio (%)", min: 0, max: 100, scale: 100 };

const BUFFER_FIELD: Field = { key: "bufferSize", label: "Buffer (msgs)", min: PARAM_LIMITS.bufferSize.min, max: PARAM_LIMITS.bufferSize.max, scale: 1 };
const REPLICAS_FIELD: Field = { key: "replicas", label: "Réplicas", min: PARAM_LIMITS.replicas.min, max: PARAM_LIMITS.replicas.max, scale: 1 };
const SHARDS_FIELD: Field = { key: "shards", label: "Shards", min: PARAM_LIMITS.shards.min, max: PARAM_LIMITS.shards.max, scale: 1 };

interface AutoscalingField {
  key: keyof AutoscalingConfig;
  label: string;
  min: number;
  max: number;
  scale: number;
}

const AUTOSCALING_FIELDS: AutoscalingField[] = [
  { key: "minReplicas", label: "Piso", min: AUTOSCALING_LIMITS.minReplicas.min, max: AUTOSCALING_LIMITS.minReplicas.max, scale: 1 },
  { key: "maxReplicas", label: "Teto", min: AUTOSCALING_LIMITS.maxReplicas.min, max: AUTOSCALING_LIMITS.maxReplicas.max, scale: 1 },
  { key: "targetUtilization", label: "Utilização-alvo (%)", min: AUTOSCALING_LIMITS.targetUtilization.min * 100, max: AUTOSCALING_LIMITS.targetUtilization.max * 100, scale: 100 },
];

function fieldsFor(type: ComponentType): Field[] {
  let fields = BASE_FIELDS;
  if (type === "cache" || type === "cdn") fields = [...fields, HIT_RATIO_FIELD];
  if (type === "queue") fields = [...fields, BUFFER_FIELD];
  if (REPLICABLE_TYPES.includes(type)) fields = [...fields, REPLICAS_FIELD];
  if (type === "nosql") fields = [...fields, SHARDS_FIELD];
  return fields;
}

function autoscalingDrafts(config: AutoscalingConfig): Record<string, string> {
  return Object.fromEntries(
    AUTOSCALING_FIELDS.map((field) => [field.key, toDisplay(config[field.key], field.scale)])
  );
}

function toDisplay(value: number | undefined, scale: number): string {
  if (value === undefined) return "";
  return String(parseFloat((value * scale).toPrecision(12)));
}

export function PropertiesPanel() {
  const nodes = useAppStore((s) => s.nodes);
  const selected = nodes.find((n) => n.selected);
  if (!selected || !selected.type) {
    return <p className="panel-empty">Selecione um componente no canvas</p>;
  }
  return <NodeForm key={selected.id} node={selected} type={selected.type} />;
}

function NodeForm({ node, type }: { node: AppNode; type: ComponentType }) {
  const removeNode = useAppStore((s) => s.removeNode);
  const renameNode = useAppStore((s) => s.renameNode);
  const updateParams = useAppStore((s) => s.updateParams);
  const applyTech = useAppStore((s) => s.applyTech);
  const fields = fieldsFor(type);
  const techPresets = techPresetsFor(type);
  const [nameDraft, setNameDraft] = useState(node.data.name);
  const [nameError, setNameError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        toDisplay(node.data.params[f.key] ?? DEFAULT_PARAMS[type][f.key], f.scale),
      ])
    )
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autoscaling = node.data.params.autoscaling;
  const [autoDrafts, setAutoDrafts] = useState<Record<string, string>>(() =>
    autoscalingDrafts(autoscaling ?? DEFAULT_AUTOSCALING)
  );
  const [autoErrors, setAutoErrors] = useState<Record<string, string>>({});

  const onAutoscalingToggle = (enabled: boolean) => {
    setAutoErrors({});
    if (!enabled) {
      updateParams(node.id, { autoscaling: undefined });
      return;
    }
    setAutoDrafts(autoscalingDrafts(DEFAULT_AUTOSCALING));
    updateParams(node.id, { autoscaling: { ...DEFAULT_AUTOSCALING } });
  };

  const onAutoscalingChange = (field: AutoscalingField, text: string) => {
    setAutoDrafts((d) => ({ ...d, [field.key]: text }));
    const value = Number(text);
    if (text.trim() === "" || Number.isNaN(value) || value < field.min || value > field.max) {
      setAutoErrors((e) => ({ ...e, [field.key]: `Valor deve estar entre ${field.min} e ${field.max}` }));
      return;
    }
    const current = node.data.params.autoscaling ?? DEFAULT_AUTOSCALING;
    const error = updateParams(node.id, {
      autoscaling: { ...current, [field.key]: value / field.scale },
    });
    setAutoErrors((e) => ({ ...e, [field.key]: error ?? "" }));
  };

  const onNameChange = (text: string) => {
    setNameDraft(text);
    setNameError(renameNode(node.id, text) ?? "");
  };

  const onTechChange = (techId: string) => {
    const tech = techId === "" ? undefined : techId;
    applyTech(node.id, tech);
    const preset = tech ? findTechPreset(type, tech) : undefined;
    if (preset) {
      setDrafts((d) => ({
        ...d,
        capacity: toDisplay(preset.capacity, 1),
        baseLatencyMs: toDisplay(preset.baseLatencyMs, 1),
      }));
      setErrors((e) => ({ ...e, capacity: "", baseLatencyMs: "" }));
    }
  };

  const onFieldChange = (field: Field, text: string) => {
    setDrafts((d) => ({ ...d, [field.key]: text }));
    const value = Number(text);
    if (text.trim() === "" || Number.isNaN(value) || value < field.min || value > field.max) {
      setErrors((e) => ({ ...e, [field.key]: `Valor deve estar entre ${field.min} e ${field.max}` }));
      return;
    }
    const error = updateParams(node.id, { [field.key]: value / field.scale });
    setErrors((e) => ({ ...e, [field.key]: error ?? "" }));
  };

  return (
    <div className="prop-form">
      <p className="prop-title">{COMPONENT_META[type].label}</p>
      <div className="prop-field">
        <label htmlFor="prop-name">Nome</label>
        <input
          id="prop-name"
          type="text"
          maxLength={40}
          value={nameDraft}
          onChange={(event) => onNameChange(event.target.value)}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "prop-name-error" : undefined}
        />
        {nameError ? <p id="prop-name-error" className="prop-error" role="alert">{nameError}</p> : null}
      </div>
      {techPresets.length > 0 && (
        <div className="prop-field">
          <label htmlFor="prop-tech">Tecnologia</label>
          <select
            id="prop-tech"
            value={node.data.tech ?? ""}
            onChange={(event) => onTechChange(event.target.value)}
          >
            <option value="">Personalizado</option>
            {techPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {type === "client" ? (
        <p className="panel-empty">Fonte de tráfego: a carga (RPS) é definida no controle global da simulação</p>
      ) : (
        <div className="prop-fields-grid">
          {fields.map((field) => {
            const errorId = `prop-${field.key}-error`;
            return (
              <div key={field.key} className="prop-field">
                <label htmlFor={`prop-${field.key}`}>{field.label}</label>
                <input
                  id={`prop-${field.key}`}
                  type="number"
                  value={drafts[field.key]}
                  min={field.min}
                  max={field.max}
                  onChange={(event) => onFieldChange(field, event.target.value)}
                  aria-invalid={Boolean(errors[field.key])}
                  aria-describedby={errors[field.key] ? errorId : undefined}
                />
                {errors[field.key] ? <p id={errorId} className="prop-error" role="alert">{errors[field.key]}</p> : null}
              </div>
            );
          })}
        </div>
      )}
      {REPLICABLE_TYPES.includes(type) && (
        <div className="prop-autoscaling">
          <label className="prop-toggle" htmlFor="prop-autoscaling">
            <input
              id="prop-autoscaling"
              type="checkbox"
              checked={autoscaling !== undefined}
              onChange={(event) => onAutoscalingToggle(event.target.checked)}
            />
            Autoscaling
          </label>
          {autoscaling !== undefined && (
            <div className="prop-fields-grid">
              {AUTOSCALING_FIELDS.map((field) => {
                const errorId = `prop-autoscaling-${field.key}-error`;
                return (
                  <div key={field.key} className="prop-field">
                    <label htmlFor={`prop-autoscaling-${field.key}`}>{field.label}</label>
                    <input
                      id={`prop-autoscaling-${field.key}`}
                      type="number"
                      value={autoDrafts[field.key]}
                      min={field.min}
                      max={field.max}
                      onChange={(event) => onAutoscalingChange(field, event.target.value)}
                      aria-invalid={Boolean(autoErrors[field.key])}
                      aria-describedby={autoErrors[field.key] ? errorId : undefined}
                    />
                    {autoErrors[field.key] ? (
                      <p id={errorId} className="prop-error" role="alert">
                        {autoErrors[field.key]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <button type="button" className="prop-delete" onClick={() => removeNode(node.id)}>
        Excluir componente
      </button>
    </div>
  );
}
