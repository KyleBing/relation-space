import type { GraphDocument } from '../types/graph'

// 示例：事件层级与因果关联
export const sampleDocument: GraphDocument = {
  version: 1,
  meta: {
    title: '示例关系图',
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: 'n1',
      label: '立项启动',
      kind: 'event',
      position: { x: 120, y: 80, z: 0 },
    },
    {
      id: 'n2',
      label: '需求调研',
      kind: 'event',
      position: { x: 320, y: 40, z: 20 },
    },
    {
      id: 'n3',
      label: '方案设计',
      kind: 'event',
      position: { x: 320, y: 180, z: -10 },
    },
    {
      id: 'n4',
      label: '核心模块',
      kind: 'thing',
      position: { x: 560, y: 100, z: 30 },
    },
    {
      id: 'n5',
      label: '上线发布',
      kind: 'event',
      position: { x: 780, y: 100, z: 0 },
    },
    {
      id: 'n6',
      label: '用户反馈',
      kind: 'concept',
      position: { x: 780, y: 260, z: -25 },
    },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', label: '引出' },
    { id: 'e2', source: 'n1', target: 'n3', label: '引出' },
    { id: 'e3', source: 'n2', target: 'n4', label: '支撑' },
    { id: 'e4', source: 'n3', target: 'n4', label: '支撑' },
    { id: 'e5', source: 'n4', target: 'n5', label: '完成' },
    { id: 'e6', source: 'n5', target: 'n6', label: '产生' },
  ],
}
