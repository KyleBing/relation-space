import { useRef, useState } from 'react'
import { useGraphStore } from '../store/graphStore'
import { InlineEditable } from './InlineEditable'

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const mode = useGraphStore((s) => s.mode)
  const title = useGraphStore((s) => s.title)
  const setMode = useGraphStore((s) => s.setMode)
  const setTitle = useGraphStore((s) => s.setTitle)
  const addNode = useGraphStore((s) => s.addNode)
  const removeSelected = useGraphStore((s) => s.removeSelected)
  const exportFile = useGraphStore((s) => s.exportFile)
  const importFile = useGraphStore((s) => s.importFile)
  const resetSample = useGraphStore((s) => s.resetSample)
  const newBlank = useGraphStore((s) => s.newBlank)
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId)
  const hasSelection = Boolean(selectedNodeId || selectedEdgeId)

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 2200)
  }

  return (
    <header className="toolbar">
      <div className="brand-block">
        <h1 className="brand">Relation Space</h1>
        <InlineEditable
          className="title-input"
          value={title}
          fallback="未命名关系图"
          placeholder="双击编辑标题"
          onChange={setTitle}
        />
      </div>

      <div className="mode-switch" role="tablist" aria-label="模式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'edit'}
          className={mode === 'edit' ? 'active' : ''}
          onClick={() => setMode('edit')}
        >
          编辑
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'view'}
          className={mode === 'view' ? 'active' : ''}
          onClick={() => setMode('view')}
        >
          3D 查看
        </button>
      </div>

      <div className="toolbar-actions">
        {mode === 'edit' && (
          <>
            <button type="button" onClick={() => addNode('event')}>
              + 事件
            </button>
            <button type="button" onClick={() => addNode('thing')}>
              + 事物
            </button>
            <button type="button" onClick={() => addNode('concept')}>
              + 概念
            </button>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={removeSelected}
            >
              删除选中
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (nodes.length || edges.length) {
              const ok = window.confirm('清空当前画布？未导出的内容将丢失。')
              if (!ok) return
            }
            newBlank()
            flash('已新建空白画布')
          }}
        >
          新建
        </button>
        <button
          type="button"
          onClick={() => {
            exportFile()
            flash('已导出 JSON')
          }}
        >
          导出 JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          导入
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            resetSample()
            flash('已重置示例')
          }}
        >
          重置示例
        </button>
        {status && <span className="toolbar-status">{status}</span>}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              await importFile(file)
              flash('导入成功')
            } catch (err) {
              flash(err instanceof Error ? err.message : '导入失败')
            }
          }}
        />
      </div>
    </header>
  )
}
