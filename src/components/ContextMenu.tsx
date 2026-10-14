import { useEffect, useRef } from 'react'
import type { GraphNode } from '../types/graph'

export type ContextMenuState =
  | {
      kind: 'pane'
      clientX: number
      clientY: number
      flowX: number
      flowY: number
    }
  | {
      kind: 'node'
      clientX: number
      clientY: number
      nodeId: string
      flowX: number
      flowY: number
    }

interface ContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
  onAdd: (kind: GraphNode['kind'], position: { x: number; y: number }) => void
  onDeleteNode?: (nodeId: string) => void
}

const ADD_ITEMS: { kind: GraphNode['kind']; label: string }[] = [
  { kind: 'event', label: '添加事件' },
  { kind: 'thing', label: '添加事物' },
  { kind: 'concept', label: '添加概念' },
]

export function ContextMenu({
  menu,
  onClose,
  onAdd,
  onDeleteNode,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  // 避免贴边溢出
  const left = Math.min(menu.clientX, window.innerWidth - 168)
  const top = Math.min(menu.clientY, window.innerHeight - 200)

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left, top }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-menu-section">在此添加</div>
      {ADD_ITEMS.map((item) => (
        <button
          key={item.kind}
          type="button"
          role="menuitem"
          className="ctx-menu-item"
          onClick={() => {
            onAdd(item.kind, { x: menu.flowX, y: menu.flowY })
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
      {menu.kind === 'node' && onDeleteNode && (
        <>
          <div className="ctx-menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="ctx-menu-item danger"
            onClick={() => {
              onDeleteNode(menu.nodeId)
              onClose()
            }}
          >
            删除节点
          </button>
        </>
      )}
    </div>
  )
}
