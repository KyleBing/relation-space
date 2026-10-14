import type { Node } from '@xyflow/react'

export type AlignMode =
  | 'left'
  | 'centerX'
  | 'right'
  | 'top'
  | 'centerY'
  | 'bottom'
  | 'distributeX'
  | 'distributeY'

function nodeSize(n: Node) {
  return {
    w: n.measured?.width ?? n.width ?? 80,
    h: n.measured?.height ?? n.height ?? 28,
  }
}

// 对选中节点做常用对齐 / 分布，返回更新后的节点列表
export function alignSelectedNodes<T extends Node>(
  nodes: T[],
  mode: AlignMode,
): T[] {
  const selected = nodes.filter((n) => n.selected)
  if (selected.length < 2) return nodes

  const boxes = selected.map((n) => {
    const { w, h } = nodeSize(n)
    return {
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      w,
      h,
      cx: n.position.x + w / 2,
      cy: n.position.y + h / 2,
      right: n.position.x + w,
      bottom: n.position.y + h,
    }
  })

  const nextPos = new Map<string, { x: number; y: number }>()

  if (mode === 'left') {
    const x = Math.min(...boxes.map((b) => b.x))
    for (const b of boxes) nextPos.set(b.id, { x, y: b.y })
  } else if (mode === 'centerX') {
    const cx = boxes.reduce((s, b) => s + b.cx, 0) / boxes.length
    for (const b of boxes) nextPos.set(b.id, { x: cx - b.w / 2, y: b.y })
  } else if (mode === 'right') {
    const right = Math.max(...boxes.map((b) => b.right))
    for (const b of boxes) nextPos.set(b.id, { x: right - b.w, y: b.y })
  } else if (mode === 'top') {
    const y = Math.min(...boxes.map((b) => b.y))
    for (const b of boxes) nextPos.set(b.id, { x: b.x, y })
  } else if (mode === 'centerY') {
    const cy = boxes.reduce((s, b) => s + b.cy, 0) / boxes.length
    for (const b of boxes) nextPos.set(b.id, { x: b.x, y: cy - b.h / 2 })
  } else if (mode === 'bottom') {
    const bottom = Math.max(...boxes.map((b) => b.bottom))
    for (const b of boxes) nextPos.set(b.id, { x: b.x, y: bottom - b.h })
  } else if (mode === 'distributeX') {
    if (boxes.length < 3) return nodes
    const sorted = [...boxes].sort((a, b) => a.cx - b.cx)
    const left = sorted[0].x
    const right = sorted[sorted.length - 1].right
    const totalW = sorted.reduce((s, b) => s + b.w, 0)
    const gap = (right - left - totalW) / (sorted.length - 1)
    let cursor = left
    for (const b of sorted) {
      nextPos.set(b.id, { x: cursor, y: b.y })
      cursor += b.w + gap
    }
  } else if (mode === 'distributeY') {
    if (boxes.length < 3) return nodes
    const sorted = [...boxes].sort((a, b) => a.cy - b.cy)
    const top = sorted[0].y
    const bottom = sorted[sorted.length - 1].bottom
    const totalH = sorted.reduce((s, b) => s + b.h, 0)
    const gap = (bottom - top - totalH) / (sorted.length - 1)
    let cursor = top
    for (const b of sorted) {
      nextPos.set(b.id, { x: b.x, y: cursor })
      cursor += b.h + gap
    }
  }

  return nodes.map((n) => {
    const p = nextPos.get(n.id)
    if (!p) return n
    return { ...n, position: { ...n.position, x: p.x, y: p.y } }
  })
}
