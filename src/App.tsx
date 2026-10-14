import { Toolbar } from './components/Toolbar'
import { EditCanvas } from './components/EditCanvas'
import { ViewCanvas3D } from './components/ViewCanvas3D'
import { Inspector } from './components/Inspector'
import { useGraphStore } from './store/graphStore'
import './App.css'

export default function App() {
  const mode = useGraphStore((s) => s.mode)

  return (
    <div className="app-shell">
      <Toolbar />
      <main className="workspace">
        {mode === 'edit' ? <EditCanvas /> : <ViewCanvas3D />}
        <Inspector />
      </main>
    </div>
  )
}
