import type { GraphDocument, GraphEdge, GraphNode } from '../types/graph'

const FILE_VERSION = 1 as const

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseNode(raw: unknown, index: number): GraphNode {
  if (!isRecord(raw)) throw new Error(`节点 #${index} 格式无效`)
  const id = String(raw.id ?? '')
  const label = String(raw.label ?? '')
  if (!id) throw new Error(`节点 #${index} 缺少 id`)
  if (!label) throw new Error(`节点 #${index} 缺少 label`)

  const kindRaw = raw.kind
  const kind =
    kindRaw === 'thing' || kindRaw === 'concept' || kindRaw === 'event'
      ? kindRaw
      : 'event'

  const pos = isRecord(raw.position) ? raw.position : {}
  return {
    id,
    label,
    kind,
    position: {
      x: Number(pos.x ?? 0),
      y: Number(pos.y ?? 0),
      z: Number(pos.z ?? 0),
    },
  }
}

function parseEdge(raw: unknown, index: number): GraphEdge {
  if (!isRecord(raw)) throw new Error(`连线 #${index} 格式无效`)
  const id = String(raw.id ?? '')
  const source = String(raw.source ?? '')
  const target = String(raw.target ?? '')
  if (!id || !source || !target) {
    throw new Error(`连线 #${index} 缺少 id/source/target`)
  }
  return {
    id,
    source,
    target,
    label: raw.label != null ? String(raw.label) : undefined,
  }
}

// 校验并规范化导入的 JSON
export function parseGraphDocument(raw: unknown): GraphDocument {
  if (!isRecord(raw)) throw new Error('文件根对象无效')

  const nodesRaw = Array.isArray(raw.nodes) ? raw.nodes : null
  const edgesRaw = Array.isArray(raw.edges) ? raw.edges : null
  if (!nodesRaw || !edgesRaw) throw new Error('缺少 nodes 或 edges 数组')

  const metaRaw = isRecord(raw.meta) ? raw.meta : {}
  const nodes = nodesRaw.map(parseNode)
  const edges = edgesRaw.map(parseEdge)

  const ids = new Set(nodes.map((n) => n.id))
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      throw new Error(`连线 ${e.id} 引用了不存在的节点`)
    }
  }

  return {
    version: FILE_VERSION,
    meta: {
      title: String(metaRaw.title ?? '未命名关系图'),
      updatedAt: String(metaRaw.updatedAt ?? new Date().toISOString()),
    },
    nodes,
    edges,
  }
}

export function toExportDocument(
  doc: Omit<GraphDocument, 'meta'> & { meta: GraphDocument['meta'] },
): GraphDocument {
  return {
    version: FILE_VERSION,
    meta: {
      ...doc.meta,
      updatedAt: new Date().toISOString(),
    },
    nodes: doc.nodes,
    edges: doc.edges,
  }
}

export function downloadJson(doc: GraphDocument, filename?: string) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `${doc.meta.title || 'relation-space'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file: File): Promise<GraphDocument> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败')
  }
  return parseGraphDocument(parsed)
}
