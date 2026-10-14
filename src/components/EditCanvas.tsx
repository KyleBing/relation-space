import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EventNode, type FlowEventNode } from './EventNode'
import { RelationEdge } from './RelationEdge'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { SelectionAlignBar } from './SelectionAlignBar'
import { alignSelectedNodes, type AlignMode } from '../lib/alignNodes'
import { nextEdgeId, useGraphStore } from '../store/graphStore'
import type { GraphEdge, GraphNode } from '../types/graph'

const nodeTypes = { event: EventNode }
const edgeTypes = { relation: RelationEdge }

function toFlowNodes(
  nodes: GraphNode[],
  prevFlow: FlowEventNode[] = [],
): FlowEventNode[] {
  // 保留已测量宽高与选中态，否则连线吸附错位 / 框选后拖动丢选中
  const prevMap = new Map(prevFlow.map((n) => [n.id, n]))
  return nodes.map((n) => {
    const prev = prevMap.get(n.id)
    return {
      id: n.id,
      type: 'event' as const,
      position: { x: n.position.x, y: n.position.y },
      data: {
        label: n.label,
        kind: n.kind,
        labelFolded: n.labelFolded === true,
      },
      ...(prev?.selected ? { selected: true } : {}),
      ...(prev?.measured ? { measured: prev.measured } : {}),
      ...(prev?.width != null ? { width: prev.width } : {}),
      ...(prev?.height != null ? { height: prev.height } : {}),
    }
  })
}

function toFlowEdges(edges: GraphEdge[], selectedEdgeId: string | null): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    type: 'relation',
    source: e.source,
    target: e.target,
    sourceHandle: 'out',
    targetHandle: 'in',
    label: e.label ?? '',
    selected: e.id === selectedEdgeId,
  }))
}

function flowToGraphNodes(
  flowNodes: FlowEventNode[],
  prev: GraphNode[],
): GraphNode[] {
  const zMap = new Map(prev.map((n) => [n.id, n.position.z ?? 0]))
  const foldMap = new Map(prev.map((n) => [n.id, n.labelFolded === true]))
  return flowNodes.map((fn) => ({
    id: fn.id,
    label: fn.data.label,
    kind: fn.data.kind,
    position: {
      x: fn.position.x,
      y: fn.position.y,
      z: zMap.get(fn.id) ?? 0,
    },
    ...(foldMap.get(fn.id) || fn.data.labelFolded
      ? { labelFolded: true }
      : {}),
  }))
}

function flowToGraphEdges(flowEdges: Edge[]): GraphEdge[] {
  return flowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === 'string' ? e.label : undefined,
  }))
}

function nodesSig(nodes: GraphNode[]) {
  return JSON.stringify(
    nodes.map((x) => [
      x.id,
      x.label,
      x.kind,
      x.position.x,
      x.position.y,
      x.position.z,
      x.labelFolded === true,
    ]),
  )
}

function edgesSig(edges: GraphEdge[]) {
  return JSON.stringify(
    edges.map((x) => [x.id, x.source, x.target, x.label]),
  )
}

function EditCanvasInner() {
  const storeNodes = useGraphStore((s) => s.nodes)
  const storeEdges = useGraphStore((s) => s.edges)
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId)
  const editingText = useGraphStore((s) => s.editingText)
  const setStoreNodes = useGraphStore((s) => s.setNodes)
  const setStoreEdges = useGraphStore((s) => s.setEdges)
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)
  const setSelectedNodeIds = useGraphStore((s) => s.setSelectedNodeIds)
  const setSelectedEdgeId = useGraphStore((s) => s.setSelectedEdgeId)
  const addNode = useGraphStore((s) => s.addNode)
  const removeNode = useGraphStore((s) => s.removeNode)
  const { screenToFlowPosition } = useReactFlow()
  const paneRef = useRef<HTMLDivElement>(null)

  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState(
    toFlowNodes(storeNodes),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toFlowEdges(storeEdges, selectedEdgeId),
  )

  const syncingFromStore = useRef(false)
  const lastNodesSig = useRef(nodesSig(storeNodes))
  const lastEdgesSig = useRef(`${edgesSig(storeEdges)}|${selectedEdgeId}`)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  useEffect(() => {
    const nSig = nodesSig(storeNodes)
    if (nSig === lastNodesSig.current) return
    lastNodesSig.current = nSig
    syncingFromStore.current = true
    setNodes((prev) => toFlowNodes(storeNodes, prev as FlowEventNode[]))
    queueMicrotask(() => {
      syncingFromStore.current = false
    })
  }, [storeNodes, setNodes])

  useEffect(() => {
    const eSig = `${edgesSig(storeEdges)}|${selectedEdgeId}`
    if (eSig === lastEdgesSig.current) return
    lastEdgesSig.current = eSig
    syncingFromStore.current = true
    setEdges(toFlowEdges(storeEdges, selectedEdgeId))
    queueMicrotask(() => {
      syncingFromStore.current = false
    })
  }, [storeEdges, selectedEdgeId, setEdges])

  const commitNodes = useCallback(
    (next: FlowEventNode[]) => {
      if (syncingFromStore.current) return
      const graphNodes = flowToGraphNodes(next, useGraphStore.getState().nodes)
      lastNodesSig.current = nodesSig(graphNodes)
      setStoreNodes(graphNodes)
    },
    [setStoreNodes],
  )

  const commitEdges = useCallback(
    (next: Edge[]) => {
      if (syncingFromStore.current) return
      const graphEdges = flowToGraphEdges(next)
      lastEdgesSig.current = `${edgesSig(graphEdges)}|${useGraphStore.getState().selectedEdgeId}`
      setStoreEdges(graphEdges)
    },
    [setStoreEdges],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            type: 'relation',
            sourceHandle: connection.sourceHandle ?? 'out',
            targetHandle: connection.targetHandle ?? 'in',
            id: nextEdgeId(),
            // 默认不显示「关联」文字
            label: '',
          },
          eds,
        )
        commitEdges(next)
        return next
      })
    },
    [setEdges, commitEdges],
  )

  // 从节点拖出连线但未落到目标时：新建事物并连上，进入编辑
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid) return
      if (!connectionState.fromNode) return
      if (connectionState.fromHandle?.type !== 'source') return

      const point =
        'changedTouches' in event ? event.changedTouches[0] : event
      const position = screenToFlowPosition({
        x: point.clientX,
        y: point.clientY,
      })

      const sourceId = connectionState.fromNode.id
      // 先写入本地节点，避免边短暂指向尚未存在的目标
      const targetId = addNode('thing', position)
      const newNode: FlowEventNode = {
        id: targetId,
        type: 'event',
        position: { x: position.x, y: position.y },
        data: { label: '', kind: 'thing' },
        selected: true,
      }
      setNodes((nds) => {
        const next = [...(nds as FlowEventNode[]), newNode]
        lastNodesSig.current = nodesSig(
          flowToGraphNodes(next, useGraphStore.getState().nodes),
        )
        return next
      })
      setEdges((eds) => {
        const next = addEdge(
          {
            id: nextEdgeId(),
            source: sourceId,
            target: targetId,
            sourceHandle: 'out',
            targetHandle: 'in',
            type: 'relation',
            label: '',
          },
          eds,
        )
        commitEdges(next)
        return next
      })
    },
    [addNode, screenToFlowPosition, setNodes, setEdges, commitEdges],
  )

  const isValidConnection = useCallback((c: Connection | Edge) => {
    return Boolean(c.source && c.target && c.source !== c.target)
  }, [])

  // 回车：在视口中心添加事件节点（与工具栏「+ 事件」一致）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return
      if (useGraphStore.getState().editingText) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable ||
          t.closest('input, textarea, [contenteditable="true"]'))
      ) {
        return
      }
      e.preventDefault()
      const el = paneRef.current
      if (!el) {
        addNode('event')
        return
      }
      const rect = el.getBoundingClientRect()
      const flow = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
      addNode('event', flow)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addNode, screenToFlowPosition])

  const onNodeDragStop = useCallback(() => {
    commitNodes(nodesRef.current as FlowEventNode[])
  }, [commitNodes])

  // 对框选/多选节点做对齐或等距分布
  const onAlign = useCallback(
    (mode: AlignMode) => {
      setNodes((nds) => {
        const next = alignSelectedNodes(nds as FlowEventNode[], mode)
        commitNodes(next)
        return next
      })
    },
    [setNodes, commitNodes],
  )

  const selectedCount = nodes.filter((n) => n.selected).length

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const ids = new Set(deleted.map((n) => n.id))
      const cur = nodesRef.current as FlowEventNode[]
      commitNodes(cur.filter((n) => !ids.has(n.id)))
      commitEdges(
        edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      )
      setSelectedNodeId(null)
    },
    [edges, commitNodes, commitEdges, setSelectedNodeId],
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((e) => e.id))
      commitEdges(edges.filter((e) => !ids.has(e.id)))
      setSelectedEdgeId(null)
    },
    [edges, commitEdges, setSelectedEdgeId],
  )

  const closeMenu = useCallback(() => setMenu(null), [])

  // 框选/多选时同步侧栏与批量属性
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length > 0) {
        setSelectedNodeIds(selNodes.map((n) => n.id))
        return
      }
      if (selEdges.length > 0) {
        setSelectedEdgeId(selEdges[selEdges.length - 1].id)
        return
      }
      setSelectedNodeIds([])
    },
    [setSelectedNodeIds, setSelectedEdgeId],
  )

  const openPaneMenu = useCallback(
    (e: ReactMouseEvent | MouseEvent) => {
      e.preventDefault()
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setMenu({
        kind: 'pane',
        clientX: e.clientX,
        clientY: e.clientY,
        flowX: flow.x,
        flowY: flow.y,
      })
    },
    [screenToFlowPosition],
  )

  const openNodeMenu = useCallback(
    (e: ReactMouseEvent | MouseEvent, node: Node) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedNodeId(node.id)
      setMenu({
        kind: 'node',
        clientX: e.clientX,
        clientY: e.clientY,
        nodeId: node.id,
        // 在节点旁偏移创建，避免完全重叠
        flowX: node.position.x + 110,
        flowY: node.position.y + 36,
      })
    },
    [setSelectedNodeId],
  )

  return (
    <div className="canvas-pane edit-pane" ref={paneRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={() => {
          setMenu(null)
        }}
        onEdgeClick={(_, e) => {
          setMenu(null)
          setSelectedEdgeId(e.id)
        }}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => {
          setMenu(null)
          setSelectedNodeIds([])
          setSelectedEdgeId(null)
        }}
        onPaneContextMenu={openPaneMenu}
        onNodeContextMenu={openNodeMenu}
        connectionMode={ConnectionMode.Strict}
        connectionRadius={16}
        // 左键框选；空格+拖动平移
        panOnDrag={false}
        panActivationKeyCode="Space"
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={editingText ? null : ['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        elevateNodesOnSelect
        edgesFocusable
        elementsSelectable
        nodesDraggable
      >
        <Background gap={18} size={1} color="rgba(40,55,70,0.1)" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const kind = (n.data as FlowEventNode['data'] | undefined)?.kind
            if (kind === 'thing') return '#b3582a'
            if (kind === 'concept') return '#3d5a80'
            return '#2f6f7e'
          }}
          maskColor="rgba(245, 247, 250, 0.7)"
        />
      </ReactFlow>

      {menu && (
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          onAdd={(kind, position) => addNode(kind, position)}
          onDeleteNode={removeNode}
        />
      )}

      <SelectionAlignBar count={selectedCount} onAlign={onAlign} />

      <p className="canvas-hint">
        拖动画布框选 · Shift 多选 · 空格+拖动平移 · 回车添加 · 拖出连线松手新建 ·
        Delete 删除
      </p>
    </div>
  )
}

export function EditCanvas() {
  return (
    <ReactFlowProvider>
      <EditCanvasInner />
    </ReactFlowProvider>
  )
}
