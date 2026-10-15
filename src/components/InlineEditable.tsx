import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useGraphStore } from '../store/graphStore'

interface InlineEditableProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  // 画布用双击；侧栏可单击进入
  activateOn?: 'dblclick' | 'click'
  // 与 store.editingNodeId 匹配时自动进入编辑
  autoEditId?: string
  // 侧栏输入框在未进入编辑时也显示清除按钮
  clearable?: boolean
}

export function InlineEditable({
  value,
  onChange,
  className = '',
  placeholder = '双击编辑',
  activateOn = 'dblclick',
  autoEditId,
  clearable = false,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  // 新建后短时间内把焦点留在输入框，避免回车和画布把光标抢走
  const holdFocusUntil = useRef(0)
  // 只拦第一次失焦，之后点到别处就正常提交
  const heldBlur = useRef(false)
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
      holdFocusUntil.current = performance.now() + 450
      heldBlur.current = false
      setEditing(true)
    }
  }, [autoEditId, editingNodeId, editing, value])

  // 光标放到文字末尾
  const placeCaret = () => {
    const el = inputRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    const end = el.value.length
    el.setSelectionRange(end, end)
  }

  useEffect(() => {
    if (!editing) return
    setEditingText(true)
    placeCaret()
    // 画布选中节点时会再抢一次焦点，下一帧补上
    const raf = requestAnimationFrame(placeCaret)
    const timer = window.setTimeout(placeCaret, 40)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      setEditingText(false)
    }
  }, [editing, setEditingText])

  const clearAutoEdit = () => {
    if (autoEditId && useGraphStore.getState().editingNodeId === autoEditId) {
      setEditingNodeId(null)
    }
  }

  const commit = () => {
    const next = draft.trim()
    // 空字符串也写回，清除后不再恢复旧内容
    if (next !== value) onChange(next)
    setDraft(next)
    setEditing(false)
    clearAutoEdit()
  }

  // 立刻清空；编辑中留在输入框里，方便接着输入
  const clearValue = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (editing) {
      setDraft('')
      inputRef.current?.focus()
      return
    }
    if (value) onChange('')
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

  const shown = editing ? draft : value
  // 编辑中的输入框，以及标记了 clearable 的侧栏字段，有内容就可清除
  const canClear = shown.trim().length > 0 && (editing || clearable)

  const control = !editing ? (
    <span
      className={`inline-editable ${value ? '' : 'is-placeholder'} ${className}`}
      title={activateOn === 'click' ? '单击编辑' : '双击编辑'}
      onClick={activateOn === 'click' ? startEdit : undefined}
      onDoubleClick={activateOn === 'dblclick' ? startEdit : undefined}
    >
      {value || placeholder}
    </span>
  ) : (
    <input
      ref={inputRef}
      className={`inline-edit-input nodrag nopan ${className}`}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        const next = e.relatedTarget as HTMLElement | null
        const toOtherField =
          next &&
          (next.closest('.inspector, .toolbar') ||
            next.tagName === 'INPUT' ||
            next.tagName === 'TEXTAREA' ||
            next.tagName === 'BUTTON')
        // 新建瞬间焦点被画布拿走时拉回一次，再点别处则提交
        if (
          performance.now() < holdFocusUntil.current &&
          !toOtherField &&
          !heldBlur.current
        ) {
          heldBlur.current = true
          requestAnimationFrame(placeCaret)
          return
        }
        commit()
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          // 创建节点的那次回车不提交，光标留在框里
          if (performance.now() < holdFocusUntil.current) return
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancel()
        }
      }}
    />
  )

  if (!editing && !clearable) return control

  return (
    <span className={`clearable${canClear ? ' has-clear' : ''}`}>
      {control}
      {canClear && (
        <button
          type="button"
          className="clear-btn nodrag nopan"
          aria-label="清除"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={clearValue}
        >
          ×
        </button>
      )}
    </span>
  )
}
