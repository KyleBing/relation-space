import type { AlignMode } from '../lib/alignNodes'

interface SelectionAlignBarProps {
  count: number
  onAlign: (mode: AlignMode) => void
}

const GROUPS: { mode: AlignMode; label: string; title: string }[][] = [
  [
    { mode: 'left', label: '左', title: '左对齐' },
    { mode: 'centerX', label: '中', title: '水平居中' },
    { mode: 'right', label: '右', title: '右对齐' },
  ],
  [
    { mode: 'top', label: '上', title: '顶对齐' },
    { mode: 'centerY', label: '中', title: '垂直居中' },
    { mode: 'bottom', label: '下', title: '底对齐' },
  ],
  [
    { mode: 'distributeX', label: '横分', title: '水平等距分布（≥3）' },
    { mode: 'distributeY', label: '纵分', title: '垂直等距分布（≥3）' },
  ],
]

export function SelectionAlignBar({ count, onAlign }: SelectionAlignBarProps) {
  if (count < 2) return null

  return (
    <div className="align-bar" role="toolbar" aria-label="节点对齐">
      <span className="align-bar-label">对齐 · {count}</span>
      {GROUPS.map((group, gi) => (
        <span key={gi} className="align-bar-group">
          {gi > 0 && <span className="align-bar-sep" />}
          {group.map((item) => (
            <button
              key={item.mode}
              type="button"
              className="align-bar-btn"
              title={item.title}
              disabled={
                (item.mode === 'distributeX' || item.mode === 'distributeY') &&
                count < 3
              }
              onClick={() => onAlign(item.mode)}
            >
              {item.label}
            </button>
          ))}
        </span>
      ))}
    </div>
  )
}
