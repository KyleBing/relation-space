// 图文档：导入导出共用同一结构
export type AppMode = 'view' | 'edit'

export interface Vec3 {
  x: number
  y: number
  z?: number
}

export interface GraphNode {
  id: string
  label: string
  // 事件 / 事物 / 概念 等
  kind: 'event' | 'thing' | 'concept'
  position: Vec3
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface GraphMeta {
  title: string
  updatedAt: string
}

export interface GraphDocument {
  version: 1
  meta: GraphMeta
  nodes: GraphNode[]
  edges: GraphEdge[]
}
