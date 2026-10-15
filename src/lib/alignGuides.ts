import type { Node } from '@xyflow/react'

export type AlignGuide = {
  // 对齐到的流程坐标；没有则不画线
  vertical?: number
  horizontal?: number
}

type Box = { x: number; y: number; w: number; h: number }

function boxOf(node: Node, pos?: { x: number; y: number }): Box {
  const w = node.measured?.width ?? node.width ?? 80
  const h = node.measured?.height ?? node.height ?? 28
  return {
    x: pos?.x ?? node.position.x,
    y: pos?.y ?? node.position.y,
    w,
    h,
  }
}

function nearest(
  from: number[],
  to: number[],
  threshold: number,
): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null
  for (const a of from) {
    for (const b of to) {
      const delta = b - a
      if (Math.abs(delta) > threshold) continue
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, at: b }
      }
    }
  }
  return best
}

// 拖动时与其他节点的边、中线对齐，返回吸附后的位置和参考线
export function snapToNodes(
  draggingId: string,
  position: { x: number; y: number },
  nodes: Node[],
  threshold: number,
): { position: { x: number; y: number }; guide: AlignGuide } {
  const self = nodes.find((n) => n.id === draggingId)
  if (!self) return { position, guide: {} }

  const moving = boxOf(self, position)
  const xs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w]
  const ys = [moving.y, moving.y + moving.h / 2, moving.y + moving.h]

  let bestX: { delta: number; at: number } | null = null
  let bestY: { delta: number; at: number } | null = null

  for (const other of nodes) {
    if (other.id === draggingId || other.hidden) continue
    const box = boxOf(other)
    const hitX = nearest(
      xs,
      [box.x, box.x + box.w / 2, box.x + box.w],
      threshold,
    )
    const hitY = nearest(
      ys,
      [box.y, box.y + box.h / 2, box.y + box.h],
      threshold,
    )
    if (hitX && (!bestX || Math.abs(hitX.delta) < Math.abs(bestX.delta))) {
      bestX = hitX
    }
    if (hitY && (!bestY || Math.abs(hitY.delta) < Math.abs(bestY.delta))) {
      bestY = hitY
    }
  }

  return {
    position: {
      x: position.x + (bestX?.delta ?? 0),
      y: position.y + (bestY?.delta ?? 0),
    },
    guide: {
      vertical: bestX?.at,
      horizontal: bestY?.at,
    },
  }
}
