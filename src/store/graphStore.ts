import { create } from 'zustand'
import type { AppMode, GraphDocument, GraphEdge, GraphNode } from '../types/graph'
import { sampleDocument } from '../lib/sample'
import { downloadJson, readJsonFile, toExportDocument } from '../lib/io'

interface GraphState {
  mode: AppMode
  title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  // 行内编辑时禁止 Delete 误删节点
  editingText: boolean
  // 新建后自动进入标签编辑的节点
  editingNodeId: string | null
  setMode: (mode: AppMode) => void
  setTitle: (title: string) => void
  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: GraphEdge[]) => void
  updateNode: (id: string, patch: Partial<GraphNode>) => void
  updateEdge: (id: string, patch: Partial<GraphEdge>) => void
  addNode: (
    kind?: GraphNode['kind'],
    position?: { x: number; y: number; z?: number },
  ) => string
  removeNode: (id: string) => void
  removeSelected: () => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setEditingText: (editing: boolean) => void
  setEditingNodeId: (id: string | null) => void
  loadDocument: (doc: GraphDocument) => void
  exportFile: () => void
  importFile: (file: File) => Promise<void>
  resetSample: () => void
  // 新建空白画布
  newBlank: () => void
}

let nodeSeq = 100
let edgeSeq = 100

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export const useGraphStore = create<GraphState>((set, get) => ({
  mode: 'edit',
  title: sampleDocument.meta.title,
  nodes: sampleDocument.nodes,
  edges: sampleDocument.edges,
  selectedNodeId: null,
  selectedEdgeId: null,
  editingText: false,
  editingNodeId: null,

  setMode: (mode) => set({ mode }),
  setTitle: (title) => set({ title }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setEditingText: (editingText) => set({ editingText }),
  setEditingNodeId: (editingNodeId) => set({ editingNodeId }),

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  addNode: (kind = 'event', position) => {
    nodeSeq += 1
    const id = uid('n')
    const n: GraphNode = {
      id,
      label: '',
      kind,
      position: position
        ? { x: position.x, y: position.y, z: position.z ?? 0 }
        : {
            x: 180 + (nodeSeq % 5) * 40,
            y: 120 + (nodeSeq % 4) * 50,
            z: 0,
          },
    }
    set((s) => ({
      nodes: [...s.nodes, n],
      selectedNodeId: id,
      selectedEdgeId: null,
      editingNodeId: id,
    }))
    return id
  },

  removeNode: (id) => {
    const { nodes, edges, selectedNodeId, editingNodeId } = get()
    set({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
      editingNodeId: editingNodeId === id ? null : editingNodeId,
    })
  },

  removeSelected: () => {
    const { selectedNodeId, selectedEdgeId, nodes, edges, editingNodeId } =
      get()
    if (selectedNodeId) {
      set({
        nodes: nodes.filter((n) => n.id !== selectedNodeId),
        edges: edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
        ),
        selectedNodeId: null,
        selectedEdgeId: null,
        editingNodeId: editingNodeId === selectedNodeId ? null : editingNodeId,
      })
      return
    }
    if (selectedEdgeId) {
      set({
        edges: edges.filter((e) => e.id !== selectedEdgeId),
        selectedEdgeId: null,
      })
    }
  },

  loadDocument: (doc) =>
    set({
      title: doc.meta.title,
      nodes: doc.nodes,
      edges: doc.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
      editingNodeId: null,
    }),

  exportFile: () => {
    const { title, nodes, edges } = get()
    const doc = toExportDocument({
      version: 1,
      meta: { title, updatedAt: new Date().toISOString() },
      nodes,
      edges,
    })
    downloadJson(doc)
  },

  importFile: async (file) => {
    const doc = await readJsonFile(file)
    get().loadDocument(doc)
  },

  resetSample: () => {
    get().loadDocument({
      ...sampleDocument,
      meta: { ...sampleDocument.meta, updatedAt: new Date().toISOString() },
    })
  },

  newBlank: () =>
    set({
      title: '未命名关系图',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      editingNodeId: null,
      mode: 'edit',
    }),
}))

// 供 React Flow 连线时生成边 id
export function nextEdgeId() {
  edgeSeq += 1
  return uid('e')
}
