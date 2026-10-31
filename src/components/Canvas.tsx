import { useCallback, useEffect } from "react";
import {
  Background,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getOutgoers,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { COMPONENT_META, COMPONENT_TYPES, canConnect } from "../engine/catalog";
import type { ComponentType } from "../engine/types";
import { useAppStore, type AppNode } from "../store/useAppStore";
import { ComponentNode } from "./ComponentNode";
import { TrafficEdge } from "./TrafficEdge";

const nodeTypes = Object.fromEntries(
  COMPONENT_TYPES.map((type) => [type, ComponentNode])
) as NodeTypes;
const edgeTypes: EdgeTypes = { traffic: TrafficEdge };
const defaultEdgeOptions = { type: "traffic" };
const FIT_VIEW_PADDING = {
  top: "112px",
  right: "48px",
  bottom: "48px",
  left: "48px",
} as const;

function setStatusIfChanged(message: string | null) {
  const state = useAppStore.getState();
  if (state.statusMessage !== message) state.setStatusMessage(message);
}

function createsCycle(sourceId: string, target: AppNode, nodes: AppNode[], edges: Edge[]) {
  const visited = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    for (const outgoer of getOutgoers(node, nodes, edges)) {
      if (outgoer.id === sourceId) return true;
      stack.push(outgoer);
    }
  }
  return false;
}

export function Canvas() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const statusMessage = useAppStore((s) => s.statusMessage);
  const loadedRevision = useAppStore((s) => s.loadedRevision);
  const { screenToFlowPosition, fitView } = useReactFlow();

  useEffect(() => {
    if (loadedRevision === 0) return;
    fitView({ padding: FIT_VIEW_PADDING, duration: 300 });
  }, [loadedRevision, fitView]);

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const state = useAppStore.getState();
    const source = state.nodes.find((n) => n.id === connection.source);
    const target = state.nodes.find((n) => n.id === connection.target);
    if (!source?.type || !target?.type || source.id === target.id) return false;
    if (!canConnect(source.type, target.type)) {
      setStatusIfChanged(
        `Conexão inválida: ${COMPONENT_META[source.type].label} não pode conectar a ${COMPONENT_META[target.type].label}`
      );
      return false;
    }
    if (createsCycle(source.id, target, state.nodes, state.edges)) {
      setStatusIfChanged("Conexão inválida: criaria um ciclo");
      return false;
    }
    setStatusIfChanged(null);
    return true;
  }, []);

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const state = useAppStore.getState();
    state.setNodes(applyNodeChanges(changes, state.nodes));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    const state = useAppStore.getState();
    state.setEdges(applyEdgeChanges(changes, state.edges));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const state = useAppStore.getState();
    state.setEdges(addEdge(connection, state.edges));
  }, []);

  const onEdgeClick = useCallback(() => {
    setStatusIfChanged("Conexão selecionada. Pressione Delete ou Backspace para excluir.");
  }, []);

  const onEdgesDelete = useCallback(() => {
    setStatusIfChanged("Conexão removida");
  }, []);

  const onPaneClick = useCallback(() => {
    setStatusIfChanged(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as ComponentType;
      if (!COMPONENT_TYPES.includes(type)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      useAppStore.getState().addNode(type, position);
    },
    [screenToFlowPosition]
  );

  return (
    <>
      <ReactFlow<AppNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="canvas-empty-state">
          <p className="canvas-empty-state-message">
            Arraste um componente da paleta à esquerda para começar
          </p>
        </div>
      )}
      {statusMessage && <div className="status-bar">{statusMessage}</div>}
    </>
  );
}
