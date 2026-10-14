import { useGraphStore } from '../store/graphStore'
import type { GraphNode } from '../types/graph'
import { InlineEditable } from './InlineEditable'

const KIND_LABEL: Record<GraphNode['kind'], string> = {
  event: '事件',
  thing: '事物',
  concept: '概念',
}

export function Inspector() {
  const mode = useGraphStore((s) => s.mode)
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const selectedNodeIds = useGraphStore((s) => s.selectedNodeIds)
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId)
  const updateNode = useGraphStore((s) => s.updateNode)
  const updateNodes = useGraphStore((s) => s.updateNodes)
  const updateEdge = useGraphStore((s) => s.updateEdge)
  const setEdges = useGraphStore((s) => s.setEdges)
  const setSelectedEdgeId = useGraphStore((s) => s.setSelectedEdgeId)

  if (mode !== 'edit') {
    return (
      <aside className="inspector">
        <h2>查看模式</h2>
        <p className="muted">
          只读 3D。共 {nodes.length} 个节点、{edges.length} 条关联。
        </p>
      </aside>
    )
  }

  const multiIds =
    selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId
        ? [selectedNodeId]
        : []
  const multiNodes = multiIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is GraphNode => Boolean(n))

  const selected = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  // 多选且同类别：批量改共享属性
  if (multiNodes.length > 1) {
    const kinds = new Set(multiNodes.map((n) => n.kind))
    const sameKind = kinds.size === 1
    const kind = multiNodes[0].kind
    const zValues = multiNodes.map((n) => n.position.z ?? 0)
    const sameZ = zValues.every((z) => z === zValues[0])
    const foldValues = multiNodes.map((n) => n.labelFolded === true)
    const sameFold = foldValues.every((f) => f === foldValues[0])

    return (
      <aside className="inspector">
        <h2>批量属性</h2>
        <p className="muted">
          已选 {multiNodes.length} 个节点
          {sameKind ? ` · 均为「${KIND_LABEL[kind]}」` : ' · 类别不一致'}
        </p>
        {!sameKind ? (
          <p className="muted">仅当选中项为同一类别时可批量修改属性。</p>
        ) : (
          <>
            <label className="field">
              <span>类型</span>
              <select
                value={kind}
                onChange={(e) =>
                  updateNodes(multiIds, {
                    kind: e.target.value as GraphNode['kind'],
                  })
                }
              >
                <option value="event">事件</option>
                <option value="thing">事物</option>
                <option value="concept">概念</option>
              </select>
            </label>
            <label className="field">
              <span>深度 Z（影响 3D）</span>
              <input
                type="number"
                value={sameZ ? zValues[0] : ''}
                placeholder={sameZ ? undefined : '多个值'}
                onChange={(e) => {
                  const z = Number(e.target.value) || 0
                  updateNodes(multiIds, { position: { z } })
                }}
              />
            </label>
            <label className="field field-check">
              <span>折叠过长文字</span>
              <input
                type="checkbox"
                checked={sameFold ? foldValues[0] : false}
                ref={(el) => {
                  if (el) el.indeterminate = !sameFold
                }}
                onChange={(e) =>
                  updateNodes(multiIds, {
                    labelFolded: e.target.checked ? true : undefined,
                  })
                }
              />
            </label>
          </>
        )}
      </aside>
    )
  }

  if (!selected && !selectedEdge) {
    return (
      <aside className="inspector">
        <h2>属性</h2>
        <p className="muted">
          选中节点或连线。画布上可双击文字直接改名。同类别多选可批量改属性。
        </p>
        <dl className="stats">
          <div>
            <dt>节点</dt>
            <dd>{nodes.length}</dd>
          </div>
          <div>
            <dt>关联</dt>
            <dd>{edges.length}</dd>
          </div>
        </dl>
      </aside>
    )
  }

  if (selectedEdge && !selected) {
    const from = nodes.find((n) => n.id === selectedEdge.source)
    const to = nodes.find((n) => n.id === selectedEdge.target)
    return (
      <aside className="inspector">
        <h2>连线属性</h2>
        <p className="muted">
          {from?.label ?? '?'} → {to?.label ?? '?'}
        </p>
        <label className="field">
          <span>关系名（也可在线上双击）</span>
          <InlineEditable
            className="inspector-inline"
            value={selectedEdge.label ?? ''}
            placeholder="关系"
            activateOn="click"
            onChange={(label) => updateEdge(selectedEdge.id, { label })}
          />
        </label>
        <button
          type="button"
          className="linkish"
          onClick={() => {
            setEdges(edges.filter((x) => x.id !== selectedEdge.id))
            setSelectedEdgeId(null)
          }}
        >
          移除连线
        </button>
      </aside>
    )
  }

  if (!selected) return null

  const related = edges.filter(
    (e) => e.source === selected.id || e.target === selected.id,
  )

  return (
    <aside className="inspector">
      <h2>节点属性</h2>
      <p className={`kind-badge kind-${selected.kind}`}>
        {KIND_LABEL[selected.kind]}
      </p>
      <label className="field">
        <span>名称（也可在节点上双击）</span>
        <InlineEditable
          className="inspector-inline"
          value={selected.label}
          fallback="未命名"
          activateOn="click"
          onChange={(label) => updateNode(selected.id, { label })}
        />
      </label>
      <label className="field">
        <span>类型</span>
        <select
          value={selected.kind}
          onChange={(e) =>
            updateNode(selected.id, {
              kind: e.target.value as GraphNode['kind'],
            })
          }
        >
          <option value="event">事件</option>
          <option value="thing">事物</option>
          <option value="concept">概念</option>
        </select>
      </label>
      <label className="field">
        <span>深度 Z（影响 3D）</span>
        <input
          type="number"
          value={selected.position.z ?? 0}
          onChange={(e) =>
            updateNode(selected.id, {
              position: {
                ...selected.position,
                z: Number(e.target.value) || 0,
              },
            })
          }
        />
      </label>
      <label className="field field-check">
        <span>折叠过长文字</span>
        <input
          type="checkbox"
          checked={selected.labelFolded === true}
          onChange={(e) =>
            updateNode(selected.id, {
              labelFolded: e.target.checked ? true : undefined,
            })
          }
        />
      </label>

      <h3>关联线</h3>
      {related.length === 0 ? (
        <p className="muted">暂无连线</p>
      ) : (
        <ul className="edge-list">
          {related.map((e) => (
            <li key={e.id}>
              <InlineEditable
                className="inspector-inline"
                value={e.label ?? ''}
                placeholder="关系名"
                activateOn="click"
                onChange={(label) => updateEdge(e.id, { label })}
              />
              <span className="edge-meta">
                {e.source === selected.id ? '→' : '←'}{' '}
                {nodes.find((n) =>
                  n.id === (e.source === selected.id ? e.target : e.source),
                )?.label ?? '?'}
              </span>
              <button
                type="button"
                className="linkish"
                onClick={() => setEdges(edges.filter((x) => x.id !== e.id))}
              >
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
