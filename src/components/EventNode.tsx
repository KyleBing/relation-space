import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { GraphNode } from '../types/graph'
import { InlineEditable } from './InlineEditable'
import { useGraphStore } from '../store/graphStore'

export type FlowEventNode = Node<
  { label: string; kind: GraphNode['kind'] },
  'event'
>

const kindClass: Record<GraphNode['kind'], string> = {
  event: 'kind-event',
  thing: 'kind-thing',
  concept: 'kind-concept',
}

function EventNodeComponent({ id, data, selected }: NodeProps<FlowEventNode>) {
  const updateNode = useGraphStore((s) => s.updateNode)

  return (
    <div
      className={`event-node ${kindClass[data.kind]} ${selected ? 'is-selected' : ''}`}
      title={`${data.label || '未命名'}（双击文字编辑）`}
    >
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="rf-handle"
      />
      <InlineEditable
        className="event-node-label"
        value={data.label}
        fallback="未命名"
        placeholder="输入名称"
        autoEditId={id}
        onChange={(label) => updateNode(id, { label })}
      />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="rf-handle"
      />
    </div>
  )
}

export const EventNode = memo(EventNodeComponent)
