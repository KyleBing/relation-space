import { create } from 'zustand'
import type {
  AppMode,
  GraphDocument,
  GraphEdge,
  GraphNode,
  Vec3,
} from '../types/graph'
import { sampleDocument } from '../lib/sample'
import { downloadJson, readJsonFile, toExportDocument } from '../lib/io'

// 批量更新可只改 position 的部分字段
type NodeBatchPatch = Omit<Partial<GraphNode>, 'position'> & {
  position?: Partial<Vec3>
}

interface GraphState {
  mode: AppMode
  title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  // 画布多选节点 id（含单选）
  selectedNodeIds: string[]
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
  // 批量更新多个节点的共享属性
  updateNodes: (ids: string[], patch: NodeBatchPatch) => void
  updateEdge: (id: string, patch: Partial<GraphEdge>) => void
  addNode: (
    kind?: GraphNode['kind'],
    position?: { x: number; y: number; z?: number },
  ) => string
  removeNode: (id: string) => void
  removeSelected: () => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedNodeIds: (ids: string[]) => void
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
  selectedNodeIds: [],
  selectedEdgeId: null,
  editingText: false,
  editingNodeId: null,

  setMode: (mode) => set({ mode }),
  setTitle: (title) => set({ title }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedNodeIds: id ? [id] : [],
      selectedEdgeId: null,
    }),
  setSelectedNodeIds: (ids) =>
    set({
      selectedNodeIds: ids,
      selectedNodeId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedEdgeId: ids.length > 0 ? null : get().selectedEdgeId,
    }),
  setSelectedEdgeId: (id) =>
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
      selectedNodeIds: [],
    }),
  setEditingText: (editingText) => set({ editingText }),
  setEditingNodeId: (editingNodeId) => set({ editingNodeId }),

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  updateNodes: (ids, patch) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const { position: posPatch, ...rest } = patch
    set((s) => ({
      nodes: s.nodes.map((n): GraphNode => {
        if (!idSet.has(n.id)) return n
        const next: GraphNode = { ...n, ...rest }
        // position 只合并传入的字段，避免冲掉 x/y
        if (posPatch) {
          next.position = {
            x: posPatch.x ?? n.position.x,
            y: posPatch.y ?? n.position.y,
            z: posPatch.z !== undefined ? posPatch.z : n.position.z,
          }
        }
        return next
      }),
    }))
  },

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  // 未指定类型时新建事物，并马上进入名称编辑
  addNode: (kind = 'thing', position) => {
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
      selectedNodeIds: [id],
      selectedEdgeId: null,
      editingNodeId: id,
      // 先占住编辑态，避免回车连发再新建一个
      editingText: true,
    }))
    return id
  },

  removeNode: (id) => {
    const { nodes, edges, selectedNodeId, selectedNodeIds, editingNodeId } =
      get()
    const nextIds = selectedNodeIds.filter((x) => x !== id)
    set({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId:
        selectedNodeId === id
          ? nextIds[nextIds.length - 1] ?? null
          : selectedNodeId,
      selectedNodeIds: nextIds,
      editingNodeId: editingNodeId === id ? null : editingNodeId,
    })
  },

  removeSelected: () => {
    const {
      selectedNodeIds,
      selectedEdgeId,
      nodes,
      edges,
      editingNodeId,
    } = get()
    if (selectedNodeIds.length > 0) {
      const idSet = new Set(selectedNodeIds)
      set({
        nodes: nodes.filter((n) => !idSet.has(n.id)),
        edges: edges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target),
        ),
        selectedNodeId: null,
        selectedNodeIds: [],
        selectedEdgeId: null,
        editingNodeId:
          editingNodeId && idSet.has(editingNodeId) ? null : editingNodeId,
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
      selectedNodeIds: [],
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
      selectedNodeIds: [],
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
