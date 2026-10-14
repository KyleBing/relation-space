# Relation Space

事件 / 事物层级关联编辑与 3D 查看。

## 功能

- **编辑模式**：拖放节点、从锚点拖出连线、改名、侧栏改属性
- **3D 查看**：极细关联线、轨道旋转缩放（只读）
- **导入 / 导出**：JSON 文件

## 开发

```bash
npm install
npm run dev
```

## JSON 格式

```json
{
  "version": 1,
  "meta": { "title": "标题", "updatedAt": "ISO 时间" },
  "nodes": [
    {
      "id": "n1",
      "label": "立项",
      "kind": "event",
      "position": { "x": 0, "y": 0, "z": 0 }
    }
  ],
  "edges": [{ "id": "e1", "source": "n1", "target": "n2", "label": "引出" }]
}
```

`kind` 可选：`event` | `thing` | `concept`。`z` 影响 3D 深度。
