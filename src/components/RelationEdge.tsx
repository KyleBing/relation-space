import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import { InlineEditable } from './InlineEditable'
import { useGraphStore } from '../store/graphStore'

export type RelationFlowEdge = Edge<{ label?: string }, 'relation'>

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  style,
}: EdgeProps<RelationFlowEdge>) {
  const updateEdge = useGraphStore((s) => s.updateEdge)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const text = typeof label === 'string' ? label : ''
  // 无标签时不显示「关联」等字样，选中后仍可双击填写
  const showLabel = Boolean(text) || Boolean(selected)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 1.6 : 1,
          stroke: selected ? '#2f6f7e' : 'rgba(35, 48, 62, 0.5)',
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label-wrap nodrag nopan ${selected ? 'is-selected' : ''} ${text ? '' : 'is-empty'}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <InlineEditable
              className="edge-label-text"
              value={text}
              placeholder=""
              onChange={(v) => updateEdge(id, { label: v })}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
