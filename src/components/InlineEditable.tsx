import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useGraphStore } from '../store/graphStore'

interface InlineEditableProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  // 提交时若为空，回退到该值（节点名不宜空）
  fallback?: string
  // 画布用双击；侧栏可单击进入
  activateOn?: 'dblclick' | 'click'
  // 与 store.editingNodeId 匹配时自动进入编辑
  autoEditId?: string
}

export function InlineEditable({
  value,
  onChange,
  className = '',
  placeholder = '双击编辑',
  fallback,
  activateOn = 'dblclick',
  autoEditId,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const setEditingText = useGraphStore((s) => s.setEditingText)
  const editingNodeId = useGraphStore((s) => s.editingNodeId)
  const setEditingNodeId = useGraphStore((s) => s.setEditingNodeId)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  // 新建节点后由 store 触发自动编辑
  useEffect(() => {
    if (autoEditId && editingNodeId === autoEditId && !editing) {
      setDraft(value)
      setEditing(true)
    }
  }, [autoEditId, editingNodeId, editing, value])

  useEffect(() => {
    setEditingText(editing)
    if (editing) {
      const el = inputRef.current
      el?.focus()
      el?.select()
    }
    return () => {
      if (editing) setEditingText(false)
    }
  }, [editing, setEditingText])

  const clearAutoEdit = () => {
    if (autoEditId && useGraphStore.getState().editingNodeId === autoEditId) {
      setEditingNodeId(null)
    }
  }

  const commit = () => {
    const trimmed = draft.trim()
    const next = trimmed || fallback || value || ''
    if (next !== value) onChange(next)
    setDraft(next)
    setEditing(false)
    clearAutoEdit()
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
    clearAutoEdit()
  }

  const startEdit = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDraft(value)
    setEditing(true)
  }

  if (!editing) {
    return (
      <span
        className={`inline-editable ${className}`}
        title={activateOn === 'click' ? '单击编辑' : '双击编辑'}
        onClick={activateOn === 'click' ? startEdit : undefined}
        onDoubleClick={activateOn === 'dblclick' ? startEdit : undefined}
      >
        {value || placeholder}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      className={`inline-edit-input nodrag nopan ${className}`}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancel()
        }
      }}
    />
  )
}
