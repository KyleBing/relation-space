import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGraphStore } from '../store/graphStore'
import type { GraphNode } from '../types/graph'

// 2D 编辑坐标 → 3D 空间缩放
const SCALE = 0.02

const kindColor: Record<GraphNode['kind'], string> = {
  event: '#2f6f7e',
  thing: '#b3582a',
  concept: '#3d5a80',
}

type Vec3 = [number, number, number]

function graphTo3D(n: GraphNode): Vec3 {
  return [
    n.position.x * SCALE,
    (n.position.z ?? 0) * SCALE + 0.4,
    n.position.y * SCALE,
  ]
}

// 三次贝塞尔采样：两端贴节点，中段上拱并微侧偏，线条更顺
function curvedLinkPoints(a: Vec3, b: Vec3, segments = 32): Vec3[] {
  const [ax, ay, az] = a
  const [bx, by, bz] = b
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const len = Math.hypot(dx, dy, dz) || 1

  const lift = Math.min(Math.max(len * 0.28, 0.18), 1.4)
  const sideAmt = len * 0.06

  // 与「上」方向叉乘得到侧向，避免多条线完全叠在一起
  let sx = -dz
  let sy = 0
  let sz = dx
  const sl = Math.hypot(sx, sy, sz)
  if (sl < 1e-6) {
    sx = 1
    sy = 0
    sz = 0
  } else {
    sx /= sl
    sz /= sl
  }

  const c1: Vec3 = [
    ax + dx / 3 + sx * sideAmt,
    ay + dy / 3 + lift,
    az + dz / 3 + sz * sideAmt,
  ]
  const c2: Vec3 = [
    bx - dx / 3 + sx * sideAmt,
    by - dy / 3 + lift,
    bz - dz / 3 + sz * sideAmt,
  ]

  const pts: Vec3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const uu = u * u
    const tt = t * t
    pts.push([
      uu * u * ax + 3 * uu * t * c1[0] + 3 * u * tt * c2[0] + tt * t * bx,
      uu * u * ay + 3 * uu * t * c1[1] + 3 * u * tt * c2[1] + tt * t * by,
      uu * u * az + 3 * uu * t * c1[2] + 3 * u * tt * c2[2] + tt * t * bz,
    ])
  }
  return pts
}

function computeBounds(nodes: GraphNode[]) {
  if (nodes.length === 0) {
    return {
      center: [0, 0.4, 0] as [number, number, number],
      radius: 2,
    }
  }
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const n of nodes) {
    const [x, y, z] = graphTo3D(n)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }
  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  ]
  const dx = maxX - minX
  const dy = maxY - minY
  const dz = maxZ - minZ
  // 包围球半径，至少留一点边距
  const radius = Math.max(Math.hypot(dx, dy, dz) / 2, 0.8)
  return { center, radius }
}

function GraphScene() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  const lines = useMemo(() => {
    return edges
      .map((e) => {
        const a = nodeMap.get(e.source)
        const b = nodeMap.get(e.target)
        if (!a || !b) return null
        return {
          id: e.id,
          points: curvedLinkPoints(graphTo3D(a), graphTo3D(b)),
        }
      })
      .filter(Boolean) as { id: string; points: Vec3[] }[]
  }, [edges, nodeMap])

  const { center, radius } = useMemo(() => computeBounds(nodes), [nodes])

  return (
    <group>
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[center[0] + 8, center[1] + 12, center[2] + 6]}
        intensity={1.1}
      />
      <directionalLight
        position={[center[0] - 6, center[1] + 4, center[2] - 8]}
        intensity={0.35}
      />

      {lines.map((l) => (
        <Line
          key={l.id}
          points={l.points}
          color="#1e2a36"
          lineWidth={0.7}
          transparent
          opacity={0.5}
          dashed={false}
        />
      ))}

      {nodes.map((n) => {
        const pos = graphTo3D(n)
        return (
          <group key={n.id} position={pos}>
            <mesh>
              <sphereGeometry args={[0.1, 20, 20]} />
              <meshStandardMaterial
                color={kindColor[n.kind]}
                roughness={0.35}
                metalness={0.15}
              />
            </mesh>
            <Html distanceFactor={7} position={[0, 0.22, 0]} center>
              <div className={`label-3d label-3d-${n.kind}`}>{n.label}</div>
            </Html>
          </group>
        )
      })}

      {/* 网格对准结构体底部中心 */}
      <gridHelper
        args={[Math.max(24, radius * 6), 24, '#9aabba', '#d5dde6']}
        position={[center[0], center[1] - 0.55, center[2]]}
      />
    </group>
  )
}

// 相机与轨道中心对准整图包围盒
function FrameStructure() {
  const nodes = useGraphStore((s) => s.nodes)
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { center, radius } = useMemo(() => computeBounds(nodes), [nodes])
  // 结构变化时重新框住；签名避免无关重渲染
  const frameKey = useMemo(
    () =>
      nodes
        .map((n) => `${n.id}:${n.position.x},${n.position.y},${n.position.z}`)
        .join('|'),
    [nodes],
  )

  useLayoutEffect(() => {
    const dist = Math.max(radius * 2.6, 3.2)
    const [cx, cy, cz] = center
    camera.position.set(cx + dist * 0.72, cy + dist * 0.52, cz + dist * 0.9)
    camera.near = 0.1
    camera.far = Math.max(200, dist * 20)
    camera.updateProjectionMatrix()

    const ctrl = controlsRef.current
    if (ctrl) {
      ctrl.target.set(cx, cy, cz)
      ctrl.minDistance = Math.max(radius * 0.35, 0.6)
      ctrl.maxDistance = Math.max(radius * 12, 20)
      ctrl.update()
    }
  }, [camera, center, radius, frameKey])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      target={center}
    />
  )
}

export function ViewCanvas3D() {
  return (
    <div className="canvas-pane view-pane">
      <Canvas camera={{ position: [6, 5, 8], fov: 48 }} dpr={[1, 2]}>
        <color attach="background" args={['#e8eef3']} />
        <fog attach="fog" args={['#e8eef3', 22, 55]} />
        <GraphScene />
        <FrameStructure />
      </Canvas>
      <p className="canvas-hint">以整图为中心旋转 · 滚轮缩放 · 右键平移</p>
    </div>
  )
}
